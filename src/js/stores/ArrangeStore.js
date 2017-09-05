import { action, computed } from 'mobx'
import { moveTabs, tabComparator } from '../libs'

export default class ArrangeStore {
  constructor (store) {
    this.store = store
  }

  @computed
  get duplicatedTabs () {
    const urlTabMap = this.store.windowStore.tabs.reduce((acc, tab) => {
      const { url } = tab
      acc[url] = acc[url] || []
      acc[url].push(tab)
      return acc
    }, {})
    return Object.values(urlTabMap).filter(x => x.length > 1)
  }

  @computed
  get duplicatedTabsCount () {
    return this.duplicatedTabs.map(x => x.length).reduce((acc, num) => acc + num, 0)
  }

  @action
  sortTabs = () => {
    const tabs = this.store.windowStore.tabs.sort(tabComparator)
    moveTabs(tabs, this.windows[0].id)
  }

  @action
  sortInWindow = () => {
    this.store.windowStore.windows.map((win) => {
      const tabs = win.tabs.sort(tabComparator)
      moveTabs(tabs, win.id, 0)
    })
  }

  @action
  groupDuplicateTabs = () => {
    if (this.duplicatedTabsCount === 0) {
      return
    }

    this.duplicatedTabs.map((tabs) => {
      moveTabs(tabs, tabs[0].windowId, -1)
    })
  }
}
