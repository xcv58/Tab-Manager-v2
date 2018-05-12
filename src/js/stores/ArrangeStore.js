import { action, computed } from 'mobx'
import { moveTabs, tabComparator } from 'libs'

export default class ArrangeStore {
  constructor (store) {
    this.store = store
  }

  @computed
  get domainTabsMap () {
    return this.store.windowStore.tabs.reduce((acc, tab) => {
      const { domain } = tab
      acc[domain] = acc[domain] || []
      acc[domain].push(tab)
      return acc
    }, {})
  }

  @action
  sortTabs = async windowId => {
    const windows = []
    if (windowId) {
      const win = await chrome.windows.get(windowId, { populate: true })
      windows.push(win)
    } else {
      const allWindows = await chrome.windows.getAll({ populate: true })
      windows.push(...allWindows)
    }
    await this.sortInWindow(windows)
  }

  @action
  groupTab = async tab => {
    const { domain } = tab
    const tabs = this.domainTabsMap[domain]
    const pinned = tabs.reduce((acc, cur) => acc || cur.pinned, false)
    const sortedTabs = tabs.sort(tabComparator)
    const { windowId } = tab
    await moveTabs(sortedTabs.map(x => ({ ...x, pinned })), windowId, 0)
  }

  groupTabs = async () => {
    await Promise.all(
      Object.entries(this.domainTabsMap).map(async ([domain, tabs]) => {
        if (tabs.length > 1) {
          const sortedTabs = tabs.sort(tabComparator)
          const { windowId, pinned } = sortedTabs[0]
          await moveTabs(sortedTabs.map(x => ({ ...x, pinned })), windowId)
        }
      })
    )
    await this.sortTabs()
  }

  sortInWindow = async (windows = []) => {
    windows.map(win => {
      const sortedTabs = win.tabs.slice().sort(tabComparator)
      const differentTabIndex = sortedTabs
        .map((tab, i) => tab.id !== win.tabs[i].id)
        .findIndex(x => x)
      if (differentTabIndex !== -1) {
        moveTabs(sortedTabs.slice(differentTabIndex), win.id, -1)
      }
    })
  }
}
