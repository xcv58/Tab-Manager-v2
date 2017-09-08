import { action, computed } from 'mobx'
import { moveTabs, tabComparator } from '../libs'

const urlPattern = /.*:\/\/[^/]*/
const getDomain = (url) => {
  const matches = url.match(urlPattern)
  if (matches) {
    return matches[0]
  }
  return url
}

export default class ArrangeStore {
  constructor (store) {
    this.store = store
  }

  @computed
  get domainTabsMap () {
    return this.store.windowStore.tabs.reduce((acc, tab) => {
      const domain = getDomain(tab.url)
      acc[domain] = acc[domain] || []
      acc[domain].push(tab)
      return acc
    }, {})
  }

  @action
  sortTabs = async () => {
    await this.groupTabs()
    await this.sortInWindow()
  }

  groupTabs = async () => {
    await Promise.all(
      Object.entries(this.domainTabsMap).map(
        async ([ domain, tabs ]) => {
          if (tabs.length > 1) {
            const sortedTabs = tabs.sort(tabComparator)
            const { windowId, pinned } = sortedTabs[0]
            await moveTabs(
              sortedTabs.map(x => ({ ...x, pinned })),
              windowId
            )
          }
        }
      )
    )
  }

  sortInWindow = async () => {
    const windows = await chrome.windows.getAll({ populate: true })
    windows.map((win) => {
      const tabs = win.tabs.sort(tabComparator)
      moveTabs(tabs, win.id)
    })
  }
}
