import { action, computed, observable } from 'mobx'
import { filter } from 'fuzzy'
import { activateTab } from 'libs'

export default class SearchStore {
  constructor (store) {
    this.store = store
  }

  @observable query = ''
  @observable focusedTab = null
  @observable typing = false

  @computed
  get matchedTabs () {
    return this.fuzzySearch()
  }

  @computed
  get matchedSet () {
    return new Set(this.matchedTabs.map(x => x.id))
  }

  @computed
  get matchedWindows () {
    return this.store.windowStore.windows.map((win) => {
      const tabs = win.tabs.filter(x => this.matchedSet.has(x.id))
      if (tabs.length) {
        return { ...win, tabs }
      }
      return null
    }).filter(x => x)
  }

  @computed
  get focusedWinIndex () {
    return this.matchedWindows.findIndex(
      (win) => win.tabs.find((tab) => tab.id === this.focusedTab)
    )
  }

  @computed
  get focusedWindow () {
    if (this.focusedWinIndex === -1) {
      return null
    }
    return this.matchedWindows[this.focusedWinIndex]
  }

  @computed
  get focusedTabIndex () {
    if (!this.focusedWindow) {
      return -1
    }
    return this.focusedWindow.tabs.findIndex((tab) => tab.id === this.focusedTab)
  }

  @action
  startType = () => {
    this.typing = true
  }

  @action
  stopType = () => {
    this.typing = false
  }

  @action
  defocusTab = () => {
    this.focusedTab = null
  }

  @action
  search = (value) => {
    this.query = value
    this.focusedTab = null
    this.findFocusedTab()
  }

  fuzzySearch = () => {
    const tabs = this.store.windowStore.tabs
    if (!this.query) {
      return tabs
    }
    const set = new Set([
      ...this.getMatchedIds(tabs, 'title'),
      ...this.getMatchedIds(tabs, 'url')
    ])
    return tabs.filter(x => set.has(x.id))
  }

  getMatchedIds = (tabs, field) => filter(
    this.query,
    tabs,
    { extract: (x) => x[field] }
  ).map(x => x.original.id)

  @action
  enter = () => {
    activateTab(this.focusedTab)
  }

  @action
  focus = (tab) => {
    this.focusedTab = tab.id
  }

  @action
  select = () => {
    if (!this.focusedTab) {
      return
    }
    chrome.tabs.get(this.focusedTab, (tab) => {
      this.store.tabStore.select(tab)
    })
  }

  @action
  selectAll = () => {
    this.store.tabStore.selectAll(this.matchedTabs)
  }

  @action
  left = () => this.jumpToHorizontalTab(-1)

  @action
  right = () => this.jumpToHorizontalTab(1)

  jumpToHorizontalTab = (direction) => {
    if (!this.focusedTab) {
      return this.findFocusedTab()
    }
    const windows = this.matchedWindows
    const { length } = windows
    if (length <= 1 || this.focusedWinIndex < 0 || this.focusedTabIndex < 0) {
      return this.findFocusedTab(direction)
    }
    if (this.focusedTab) {
      this.jumpToWin(
        this.focusedWindow.tabs[this.focusedTabIndex],
        windows[(this.focusedWinIndex + length + direction) % length]
      )
    } else {
      this.jumpToTab(0)
    }
  }

  jumpToWin = (tab, win) => {
    const delta = win.tabs.map((t) => Math.abs(t.index - tab.index))
    const target = delta.indexOf(Math.min(...delta))
    this.focusedTab = win.tabs[target].id
  }

  @action
  up = () => this.findFocusedTab(-1)

  @action
  down = () => this.findFocusedTab(1)

  @action
  lastTab = () => this.jumpToTab(-1)

  @action
  firstTab = () => this.jumpToTab(0)

  findFocusedTab = (step = 1) => {
    const { length } = this.matchedTabs
    if (length === 0) {
      return
    }
    if (this.focusedTab) {
      const index = this.matchedTabs.findIndex(x => x.id === this.focusedTab)
      this.jumpToTab(index + step)
    } else {
      const index = (length + ((step - 1) / 2)) % length
      this.jumpToTab(index)
    }
  }

  jumpToTab = (index = 0) => {
    const { length } = this.matchedTabs
    if (length === 0) {
      return
    }
    const newIndex = (length + index) % length
    this.focusedTab = this.matchedTabs[newIndex].id
  }
}
