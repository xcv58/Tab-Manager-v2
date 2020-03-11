import { action, computed, observable } from 'mobx'
import Tab from './Tab'
import { browser } from 'libs'
import Store from 'stores'

const isValidIndex = (index, length) => index >= 0 && index < length

export default class Window {
  store: Store

  constructor (win, store: Store) {
    this.store = store
    Object.assign(this, win)
    this.tabs = win.tabs.map(tab => new Tab(tab, store, this))
    // TODO: Remove this when we add concurrent mode
    this.showTabs = !this.store.windowStore.initialLoading
  }

  @observable
  tabs: Tab[] = []

  @observable
  id

  // TODO: Remove this when we add concurrent mode
  @observable
  showTabs

  @observable
  type

  @action
  tabMounted = () => {
    this.tabs
      .filter(x => !x.isVisible && !x.showTab)
      .forEach(x => (x.showTab = true))
    const tab = this.tabs.find(x => !x.showTab)
    if (tab) {
      tab.showTab = true
    }
  }

  @action
  onTitleClick = () => {
    browser.windows.update(this.id, { focused: true })
  }

  @computed
  get visibleLength () {
    const { length } = this.tabs.filter(x => x.isVisible)
    return length ? length + 2 : length
  }

  @computed
  get lastFocused () {
    return this.id === this.store.windowStore.lastFocusedWindowId
  }

  @computed
  get canDrop () {
    return !['popup', 'devtools'].includes(this.type)
  }

  @computed
  get invisibleTabs () {
    return this.tabs.filter(x => !x.isVisible)
  }

  @computed
  get disableSelectAll () {
    return this.matchedTabs.length === 0
  }

  @computed
  get matchedTabs () {
    return this.tabs.filter(x => x.isMatched)
  }

  @computed
  get allTabSelected () {
    return (
      !this.disableSelectAll &&
      this.matchedTabs.every(this.store.tabStore.isTabSelected)
    )
  }

  @computed
  get someTabSelected () {
    return (
      !this.allTabSelected && this.tabs.some(this.store.tabStore.isTabSelected)
    )
  }

  @action
  add = (tab, index) => {
    if (index < 0 || index > this.tabs.length) {
      throw new Error(`[Window-Store.add] get invalid index: "${index}"!`)
    }
    this.tabs.splice(index, 0, tab)
  }

  @action
  remove = tab => {
    const index = this.tabs.findIndex(x => x.id === tab.id)
    if (index !== -1) {
      this.tabs.splice(index, 1)
    } else {
      throw new Error(
        `[Window-Store.remove] get invalid tab: ${JSON.stringify(tab)}!`
      )
    }
  }

  @action
  removeTabs = set => {
    for (let index = 0; index < this.tabs.length;) {
      const id = this.tabs[index].id
      if (set.has(id)) {
        this.tabs.splice(index, 1)
        set.delete(id)
      } else {
        index++
      }
    }
  }

  @action
  reload = () => {
    this.tabs.forEach(tab => tab.reload())
  }

  @action
  close = () => {
    browser.windows.remove(this.id)
  }

  @action
  toggleSelectAll = () => {
    const { allTabSelected, matchedTabs } = this
    const { selectAll, unselectAll } = this.store.tabStore
    if (allTabSelected) {
      unselectAll(matchedTabs)
    } else {
      selectAll(matchedTabs)
    }
  }

  @action
  onMoved = (tabId, moveInfo) => {
    const { fromIndex, toIndex } = moveInfo
    if (
      !(
        isValidIndex(fromIndex, this.tabs.length) &&
        isValidIndex(toIndex, this.tabs.length)
      )
    ) {
      return false
    }
    const toTab = this.tabs[toIndex]
    if (toTab.id === tabId) {
      return true
    }
    const fromTab = this.tabs[fromIndex]
    if (fromTab.id !== tabId) {
      return false
    }
    this.tabs[fromIndex] = toTab
    this.tabs[toIndex] = fromTab
    return true
  }
}
