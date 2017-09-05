import { action, computed, observable } from 'mobx'
import { activateTab, moveTabs } from '../libs'

export default class TabStore {
  constructor (store) {
    this.store = store
  }

  @observable selection = new Map()
  @observable targetId = null
  @observable before = true
  @observable dragging = false

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
  dragEnd = () => {
    this.selection.clear()
    this.targetId = null
    this.before = false
    this.dragging = false
  }

  @action
  dragStart = (tab) => {
    this.selection.set(tab.id, tab)
    this.dragging = true
  }

  @action
  setDropTarget = (id, before) => {
    this.targetId = id
    this.before = before
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

  getUnselectedTabs = (tabs) => {
    return tabs.filter(x => !this.selection.has(x.id))
  }

  @action
  drop = (tab) => {
    const { windowId } = tab
    const win = this.store.windowStore.windowsMap.get(windowId)
    const targetIndex = tab.index + (this.before ? 0 : 1)
    const index = this.getUnselectedTabs(win.tabs.slice(0, targetIndex)).length
    if (index !== targetIndex) {
      const tabs = this.getUnselectedTabs(win.tabs)
      moveTabs(tabs, windowId)
    }
    moveTabs(this.sources, windowId, index)
  }

  @action
  focus = (tab) => {
    activateTab(tab.id)
  }
}
