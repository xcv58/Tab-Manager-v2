import { action, observable } from 'mobx'
import actions from 'libs/actions'

export default class DragStore {
  constructor (store) {
    this.store = store
  }

  @observable dropped = false

  @action
  dragStart = (tab) => {
    this.store.tabStore.selection.set(tab.id, tab)
  }

  @action
  dragEnd = () => {
    if (!this.dropped) {
      this.clear()
    }
  }

  clear = () => {
    this.store.tabStore.selection.clear()
    this.dropped = false
  }

  getUnselectedTabs = (tabs) => {
    return tabs.filter(x => !this.store.tabStore.selection.has(x.id))
  }

  @action
  drop = async (tab, before = true) => {
    const { moveTabs, getAllWindows } = this.store.windowStore
    this.dropped = true
    const { windowId } = tab
    const win = await chrome.windows.get(windowId, { populate: true })
    const targetIndex = tab.index + (before ? 0 : 1)
    const index = this.getUnselectedTabs(win.tabs.slice(0, targetIndex)).length
    if (index !== targetIndex) {
      const tabs = this.getUnselectedTabs(win.tabs)
      await moveTabs(tabs, windowId, 0)
    }
    await moveTabs(this.store.tabStore.sources, windowId, index)
    this.clear()
    getAllWindows()
  }

  @action
  dropToNewWindow = async () => {
    const tabs = this.store.tabStore.sources.map(({ id, pinned }) => ({ id, pinned }))
    chrome.runtime.sendMessage({
      tabs,
      action: actions.createWindow
    })
    this.clear()
  }
}
