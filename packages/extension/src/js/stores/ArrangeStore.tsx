import { makeAutoObservable } from 'mobx'
import { moveTabs, tabComparator, browser } from 'libs'
import Window from 'stores/Window'
import Store from 'stores'
import Tab from './Tab'

export default class ArrangeStore {
  store: Store

  constructor(store: Store) {
    makeAutoObservable(this)

    this.store = store
  }

  get noGroupId() {
    return this.store.tabGroupStore?.getNoGroupId?.() ?? -1
  }

  isNoGroupId = (groupId: number) => groupId === this.noGroupId

  get domainTabsMap() {
    return this.store.windowStore.tabs
      .filter((tab) => this.isNoGroupId(tab.groupId))
      .reduce((acc: { [key: string]: Tab[] }, tab) => {
        const { domain } = tab
        acc[domain] = acc[domain] || []
        acc[domain].push(tab)
        return acc
      }, {})
  }

  getTabsForDomain = (domain: string) => {
    return this.domainTabsMap[domain] || []
  }

  getTabBlocks = (tabs: Tab[]) => {
    const blocks: Tab[][] = []
    for (let i = 0; i < tabs.length; ) {
      const tab = tabs[i]
      const groupId = tab.groupId
      const block: Tab[] = []
      if (this.isNoGroupId(groupId)) {
        while (i < tabs.length && this.isNoGroupId(tabs[i].groupId)) {
          block.push(tabs[i])
          i += 1
        }
      } else {
        while (i < tabs.length && tabs[i].groupId === groupId) {
          block.push(tabs[i])
          i += 1
        }
      }
      blocks.push(block)
    }
    return blocks
  }

  sortTabs = async (windowId?: string) => {
    const windows = []
    if (windowId) {
      const win = await browser.windows.get(windowId, { populate: true })
      windows.push(win)
    } else {
      const allWindows = await browser.windows.getAll({ populate: true })
      windows.push(...allWindows)
    }
    await this.sortInWindow(windows.map((win) => new Window(win, this.store)))
  }

  groupTab = async (tab: Tab) => {
    const { domain } = tab
    const tabs = this.getTabsForDomain(domain)
    if (!tabs.length) {
      return
    }
    const pinned = tabs.reduce((acc, cur) => acc || cur.pinned, false)
    const sortedTabs = tabs.sort(tabComparator)
    const { windowId } = tab
    await moveTabs(
      sortedTabs.map((x) => ({ ...x, pinned })),
      windowId,
      0,
    )
  }

  groupTabs = async () => {
    await Promise.all(
      Object.entries(this.domainTabsMap).map(
        async ([_, tabs]: [string, Tab[]]) => {
          if (tabs.length > 1) {
            const sortedTabs = tabs.sort(tabComparator)
            const { windowId, pinned } = sortedTabs[0]
            await moveTabs(
              sortedTabs.map((x) => ({ ...x, pinned })),
              windowId,
            )
          }
        },
      ),
    )
    await this.sortTabs()
  }

  sortInWindow = async (windows: Window[] = []) => {
    for (const win of windows) {
      const blocks = this.getTabBlocks(win.tabs)
      let fromIndex = 0
      for (const block of blocks) {
        const sortedBlock = [...block].sort(tabComparator)
        const hasDiff = sortedBlock.some((tab, i) => tab.id !== block[i].id)
        if (hasDiff) {
          await moveTabs(sortedBlock, win.id, fromIndex)
          for (let i = 0; i < sortedBlock.length; i++) {
            win.tabs[fromIndex + i] = sortedBlock[i]
          }
        }
        fromIndex += block.length
      }
    }
  }
}
