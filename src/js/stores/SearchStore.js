import { action, computed, observable } from 'mobx'
import { filter } from 'fuzzy'
import { activateTab } from '../libs'

export default class SearchStore {
  constructor (store) {
    this.store = store
  }

  @observable query = ''
  @observable focusedTab = null
  @observable typing = false
  // TODO: Fix in UI side, this is a hack way to handle scrollIntoView({ behavior: 'smooth' }) doesn't work
  @observable searchTriggered = false

  @action
  scrolled = () => {
    this.searchTriggered = false
  }

  @computed
  get matchedTabs () {
    return this.fuzzySearch()
  }

  @computed
  get matchedSet () {
    return new Set(this.matchedTabs.map(x => x.id))
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
    this.searchTriggered = true
    this.findFocusedTab()
  }

  fuzzySearch = () => {
    const tabs = this.store.windowStore.tabs
    if (!this.query) {
      return tabs
    }
    const options = {
      // TODO: this will cause bug to if both title and url have part of query
      extract: ({ title, url }) => `${title} ${url}`
    }
    return filter(this.query, tabs, options)
    .sort((a, b) => a.index - b.index)
    .map((x) => x.original)
  }

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
  up = () => this.findFocusedTab(-1)

  @action
  down = () => this.findFocusedTab()

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
