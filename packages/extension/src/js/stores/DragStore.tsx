import { makeAutoObservable } from 'mobx'
import Store from 'stores'
import Tab from './Tab'

export default class DragStore {
  store: Store

  constructor(store: Store) {
    makeAutoObservable(this)

    this.store = store
  }

  dropped = false

  dragging = false

  dragStart = (tab: Tab) => {
    tab.select()
    tab.unhover()
    this.dragging = true
    this.store.tabStore.selection.set(tab.id, tab)
    return this.store.tabStore.selection
  }

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

  getUnselectedTabs = (tabs: Tab[]) => {
    return tabs.filter((x) => !this.store.tabStore.selection.has(x.id))
  }

  drop = async (tab: Tab, before = true) => {
    const { moveTabs, getTargetWindow, suspend, resume } =
      this.store.windowStore
    suspend()
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
    resume()
  }

  dropToNewWindow = async () => {
    const { sources } = this.store.tabStore
    this.store.windowStore.createNewWindow(sources)
    this.clear()
  }
}
