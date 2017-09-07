import { action, observable } from 'mobx'
import { moveTabs, createWindow } from '../libs'

export default class DragStore {
  constructor (store) {
    this.store = store
  }

  @observable targetId = null
  @observable before = true
  @observable dragging = false
  @observable dropped = false

  @action
  dragStart = (tab) => {
    this.store.searchStore.defocusTab()
    this.store.tabStore.selection.set(tab.id, tab)
    this.dragging = true
  }

  @action
  dragEnd = () => {
    if (!this.dropped) {
      this.dropToNewWindow()
    }
  }

  clear = () => {
    this.store.tabStore.selection.clear()
    this.targetId = null
    this.before = false
    this.dragging = false
    this.dropped = false
  }

  @action
  setDropTarget = (id, before) => {
    this.targetId = id
    this.before = before
  }

  getUnselectedTabs = (tabs) => {
    return tabs.filter(x => !this.store.tabStore.selection.has(x.id))
  }

  @action
  drop = async (tab) => {
    this.dropped = true
    const { windowId } = tab
    const win = this.store.windowStore.windowsMap.get(windowId)
    const targetIndex = tab.index + (this.before ? 0 : 1)
    const index = this.getUnselectedTabs(win.tabs.slice(0, targetIndex)).length
    if (index !== targetIndex) {
      const tabs = this.getUnselectedTabs(win.tabs)
      await moveTabs(tabs, windowId, 0)
    }
    await moveTabs(this.store.tabStore.sources, windowId, index)
    this.clear()
  }

  dropToNewWindow = async () => {
    await createWindow(this.store.tabStore.sources)
    this.clear()
  }
}
