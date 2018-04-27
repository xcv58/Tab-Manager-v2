import { action, observable } from 'mobx'

export default class DragStore {
  constructor (store) {
    this.store = store
  }

  @observable dropped = false
  @observable dragging = false

  @action
  dragStart = tab => {
    tab.select()
    tab.unhover()
    this.dragging = true
    this.store.tabStore.selection.set(tab.id, tab)
  }

  @action
  dragEnd = () => {
    this.dragging = false
    if (!this.dropped) {
      this.clear()
    }
  }

  clear = () => {
    this.store.tabStore.selection.clear()
    this.dropped = false
  }

  getUnselectedTabs = tabs => {
    return tabs.filter(x => !this.store.tabStore.selection.has(x.id))
  }

  @action
  drop = async (tab, before = true) => {
    const { moveTabs, getTargetWindow } = this.store.windowStore
    const { windowId } = tab
    const win = getTargetWindow(windowId)
    const targetIndex = tab.index + (before ? 0 : 1)
    const index = this.getUnselectedTabs(win.tabs.slice(0, targetIndex)).length
    if (index !== targetIndex) {
      const tabs = this.getUnselectedTabs(win.tabs).slice(0, targetIndex - 1)
      await moveTabs(tabs, windowId, 0)
    }
    await moveTabs(this.store.tabStore.sources, windowId, index)
    this.clear()
    this.dropped = true
  }

  @action
  dropToNewWindow = async () => {
    const { sources } = this.store.tabStore
    this.store.windowStore.createNewWindow(sources)
    this.clear()
  }
}
