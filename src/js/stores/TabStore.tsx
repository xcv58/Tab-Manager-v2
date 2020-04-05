import { action, computed, observable } from 'mobx'
import { activateTab, togglePinTabs } from 'libs'
import Store from 'stores'
import log from 'libs/log'
import Tab from './Tab'
import Window from './Window'

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

  @computed
  get hasFocusedOrSelectedTab () {
    const { focusedItem } = this.store.focusStore
    return this.selection.size > 0 || focusedItem !== null
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

  @computed
  get sources () {
    return Array.from(this.selection.values()).sort((a, b) => {
      if (a.windowId === b.windowId) {
        return a.index - b.index
      }
      return a.windowId - b.windowId
    })
  }

  @action
  activate = (tab) => {
    activateTab(tab.id)
  }

  @action
  remove = () => {
    const { down, focusedTabId } = this.store.focusStore
    const { tabs } = this.store.windowStore
    let tabsToRemove = []
    if (this.selection.size > 0) {
      while (this.selection.has(this.store.focusStore.focusedTabId)) {
        down()
        if (focusedTabId === this.store.focusStore.focusedTabId) {
          this.store.focusStore.defocus()
          break
        }
      }
      tabsToRemove = tabs.filter((x) => x.isSelected)
    } else {
      if (focusedTabId) {
        tabsToRemove = tabs.filter((x) => x.isFocused)
        down()
      }
    }
    this.unselectAll()
    tabsToRemove.forEach((x) => x.remove())
  }

  @action
  reload = () => {
    const { focusedItem } = this.store.focusStore
    const { tabs } = this.store.windowStore
    let tabsToReload = []
    if (this.selection.size > 0) {
      tabsToReload = tabs.filter((x) => x.isSelected)
    } else {
      if (focusedItem) {
        tabsToReload = tabs.filter((x) => x.isFocused)
      }
    }
    this.unselectAll()
    tabsToReload.forEach((x) => x.reload())
  }

  @action
  togglePin = async () => {
    const { focusedItem } = this.store.focusStore
    if (this.selection.size === 0 && focusedItem) {
      log.debug('togglePin for focusedItem:', { focusedItem })
      if (focusedItem instanceof Tab) {
        await togglePinTabs([focusedItem])
      }
      if (focusedItem instanceof Window) {
        await togglePinTabs(focusedItem.tabs)
      }
    } else {
      await togglePinTabs([...this.selection.values()])
      this.unselectAll()
    }
  }

  isTabSelected = ({ id }) => this.selection.has(id)
}
