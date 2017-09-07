import { action, computed } from 'mobx'
import { moveTabs, tabComparator } from '../libs'

export default class ArrangeStore {
  constructor (store) {
    this.store = store
  }

  @computed
  get urlTabMap () {
    return this.store.windowStore.tabs.reduce((acc, tab) => {
      const { url } = tab
      acc[url] = acc[url] || []
      acc[url].push(tab)
      return acc
    }, {})
  }

  @computed
  get duplicatedTabs () {
    return Object.values(this.urlTabMap).filter(x => x.length > 1)
  }

  @action
  sortTabs = () => {
    this.store.windowStore.windows.map((win) => {
      const tabs = win.tabs.sort(tabComparator)
      moveTabs(tabs, win.id, 0)
    })
    this.groupDuplicateTabs()
  }

  groupDuplicateTabs = () => {
    this.duplicatedTabs.map((tabs) => {
      moveTabs(tabs, tabs[0].windowId, -1)
    })
  }
}
