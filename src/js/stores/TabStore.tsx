import { action, computed, observable } from 'mobx'
import { activateTab } from 'libs'
import Store from 'stores'
import log from 'libs/log'
import Tab from './Tab'

export default class TabStore {
  store: Store

  constructor (store) {
    this.store = store
  }

  @observable
  selection = observable.map()

  @computed
  get tabDescription () {
    const { size } = this.selection
    if (size === 0) {
      return 'focused tab'
    }
    if (size === 1) {
      return 'selected tab'
    }
    return 'selected tabs'
  }

  @action
  select = (tab) => {
    const { id } = tab
    if (this.selection.has(id)) {
      this.selection.delete(id)
    } else {
      this.selection.set(id, tab)
    }
  }

  @action
  selectTabsInSameContainer =
    process.env.TARGET_BROWSER === 'firefox'
      ? (tab) => {
        const tabs = this.store.windowStore.tabs.filter(
          (x) => x.cookieStoreId === tab.cookieStoreId
        )
        if (tab.isSelected) {
          tabs.forEach((x) => this.selection.delete(x.id))
        } else {
          tabs.forEach((x) => this.selection.set(x.id, x))
        }
      }
      : () => {}

  @action
  selectAll = (tabs) => {
    tabs.map((tab) => {
      this.selection.set(tab.id, tab)
    })
  }

  @action
  invertSelect = (tabs) => {
    tabs.forEach(this.select)
  }

  @action
  unselectAll = (tabs?: Tab[]) => {
    if (!tabs) {
      return this.selection.clear()
    }
    tabs.forEach(({ id }) => this.selection.delete(id))
  }

  @action
  bulkSelct = (tab) => {
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

  @computed
  get sources () {
    return Array.from(this.selection.values()).sort((a, b) => {
      if (a.windowId === b.windowId) {
        return a.index - b.index
      }
      return a.windowId - b.windowId
    })
  }

  // TODO: this abstraction may be useless
  @action
  activate = (tab) => {
    activateTab(tab.id)
  }

  isTabSelected = ({ id }) => this.selection.has(id)
}
