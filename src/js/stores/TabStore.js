import { action, computed, observable } from 'mobx'
import { activateTab } from '../libs'

export default class TabStore {
  constructor (store) {
    this.store = store
  }

  @observable selection = new Map()

  @action
  select = (tab) => {
    const { id } = tab
    if (this.selection.has(id)) {
      this.selection.delete(id)
    } else {
      this.selection.set(id, tab)
    }
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
      if (this.selection.has(focusedTab)) {
        while (this.selection.has(this.store.searchStore.focusedTab)) {
          findFocusedTab()
        }
      }
      chrome.tabs.remove(
        this.selection.values().map(x => x.id),
        () => this.selection.clear()
      )
    } else {
      if (focusedTab) {
        this.store.searchStore.findFocusedTab()
        chrome.tabs.remove(focusedTab)
      }
    }
  }
}
