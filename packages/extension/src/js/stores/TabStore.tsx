import { observable, makeAutoObservable } from 'mobx'
import { activateTab } from 'libs'
import Store from 'stores'
import log from 'libs/log'
import Tab from './Tab'

export default class TabStore {
  store: Store

  constructor(store: Store) {
    makeAutoObservable(this)

    this.store = store
  }

  selection = observable.map()

  get tabDescription() {
    const { size } = this.selection
    if (size === 0) {
      return 'focused tab'
    }
    if (size === 1) {
      return 'selected tab'
    }
    return 'selected tabs'
  }

  select = (tab: Tab) => {
    const { id } = tab
    if (this.selection.has(id)) {
      this.selection.delete(id)
    } else {
      this.selection.set(id, tab)
    }
  }

  selectTabsInSameContainer =
    process.env.TARGET_BROWSER === 'firefox'
      ? (tab: Tab) => {
          const tabs = this.store.windowStore.tabs.filter(
            (x) => x.cookieStoreId === tab.cookieStoreId,
          )
          if (tab.isSelected) {
            tabs.forEach((x) => this.selection.delete(x.id))
          } else {
            tabs.forEach((x) => this.selection.set(x.id, x))
          }
        }
      : () => {}

  selectAll = (tabs: Tab[]) => {
    tabs.forEach((tab) => {
      this.selection.set(tab.id, tab)
    })
  }

  invertSelect = (tabs: Tab[]) => {
    tabs.forEach(this.select)
  }

  unselectAll = (tabs?: Tab[]) => {
    if (!tabs) {
      return this.selection.clear()
    }
    tabs.forEach(({ id }) => this.selection.delete(id))
  }

  bulkSelct = (tab: Tab) => {
    log.debug('blukSelect:', tab)
    const { tabs } = this.store.windowStore
    let fromIndex = -1
    let toIndex = -1
    let index = -1
    for (let i = 0; i < tabs.length; i++) {
      const currentTab = tabs[i]
      if (currentTab.id === tab.id) {
        index = i
        continue
      }
      if (!currentTab.isSelected) {
        continue
      }
      if (index === -1) {
        fromIndex = i
      } else {
        toIndex = toIndex === -1 ? i : toIndex
      }
    }
    log.debug({ fromIndex, index, toIndex })
    if (index === -1) {
      return
    }
    if (fromIndex !== -1) {
      return this.selectAll(tabs.slice(fromIndex + 1, index + 1))
    }
    if (toIndex !== -1) {
      return this.selectAll(tabs.slice(index, toIndex))
    }
    this.select(tab)
  }

  get sources() {
    return Array.from(this.selection.values()).sort((a, b) => {
      if (a.windowId === b.windowId) {
        return a.index - b.index
      }
      return a.windowId - b.windowId
    })
  }

  // TODO: this abstraction may be useless
  activate = (tab: Tab) => {
    activateTab(tab.id)
  }

  isTabSelected = ({ id }: { id: number }) => this.selection.has(id)
}
