import { action, observable } from 'mobx'
import Fuse from 'fuse.js'
import windowsStore from './WindowsStore'
import tabsStore from './TabsStore'
import { activateTab } from '../libs'

class SearchStore {
  @observable query = ''
  @observable matchedTabs = []
  @observable matchedTabsMap = new Map()
  @observable focusedTab = null
  @observable typing = false

  @action
  startType = () => {
    this.typing = true
  }

  @action
  stopType = () => {
    this.typing = false
  }

  @action
  search = (value) => {
    this.query = value
    this.matchedTabs = this.fuzzySearch(this.query)
    this.focusedTab = null
    this.matchedTabsMap.clear()
    this.matchedTabs.map((tab) => this.matchedTabsMap.set(tab.id, tab))
    if (value) {
      this.findFocusedTab(1)
    }
  }

  fuzzySearch = (query) => {
    const tabs = [].concat(...(windowsStore.windows.map(x => x.tabs.slice())))
    if (!query) {
      return tabs
    }
    const containsUpperCase = (/[A-Z]/.test(query))
    return new Fuse(tabs, {
      threshold: 0.6,
      caseSensitive: containsUpperCase,
      shouldSort: false,
      keys: [ 'title' ]
    }).search(query)
  }

  @action
  enter = () => {
    activateTab(this.focusedTab)
  }

  @action
  select = () => {
    if (!this.focusedTab) {
      return
    }
    chrome.tabs.get(this.focusedTab, (tab) => {
      tabsStore.select(tab)
    })
  }

  @action
  up = () => {
    this.findFocusedTab(-1)
  }

  @action
  down = () => {
    this.findFocusedTab()
  }

  findFocusedTab = (step = 1) => {
    const { length } = this.matchedTabs
    if (length === 0) {
      return
    }
    if (this.focusedTab) {
      const index = this.matchedTabs.findIndex(x => x.id === this.focusedTab)
      const nextIndex = (length + index + step) % length
      this.focusedTab = this.matchedTabs[nextIndex].id
    } else {
      const index = (length + ((step - 1) / 2)) % length
      this.focusedTab = this.matchedTabs[index].id
    }
  }
}

export default new SearchStore()
