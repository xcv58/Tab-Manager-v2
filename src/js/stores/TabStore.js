import { action, computed, observable } from 'mobx'
import { activateTab, togglePinTabs } from 'libs'

export default class TabStore {
  constructor (store) {
    this.store = store
  }

  @observable selection = new Map()

  @computed
  get closeAllTitle () {
    return `Close ${this.tabDescription}`
  }

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
  selectAll = (tabs) => {
    tabs.map(tab => {
      this.selection.set(tab.id, tab)
    })
  }

  @action
  unselectAll = (tabs) => {
    if (!tabs) {
      return this.selection.clear()
    }
    tabs.forEach(({ id }) => this.selection.delete(id))
  }

  @computed
  get sources () {
    return this.selection.values().sort((a, b) => {
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
    const { findFocusedTab, focusedTab } = this.store.searchStore
    if (this.selection.size > 0) {
      while (this.selection.has(this.store.searchStore.focusedTab)) {
        findFocusedTab()
        if (focusedTab === this.store.searchStore.focusedTab) {
          this.store.searchStore.defocusTab()
          break
        }
      }
      chrome.tabs.remove(
        this.selection.values().map(x => x.id),
        this.unselectAll
      )
    } else {
      if (focusedTab) {
        findFocusedTab()
        chrome.tabs.remove(focusedTab)
      }
    }
  }

  @action
  togglePin = async () => {
    const { focusedTab } = this.store.searchStore
    if (this.selection.size === 0 && focusedTab) {
      const tab = await chrome.tabs.get(focusedTab)
      await togglePinTabs([ tab ])
    } else {
      await togglePinTabs(this.selection.values())
      this.unselectAll()
    }
  }
}
