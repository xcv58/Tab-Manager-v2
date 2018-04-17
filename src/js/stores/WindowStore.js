import { action, computed, observable } from 'mobx'
import {
  moveTabs,
  getLastFocusedWindowId,
  notSelfPopup,
  windowComparator
} from 'libs'
import Window from './Window'

export default class WindowsStore {
  constructor (store) {
    this.store = store
  }

  @observable windows = []
  @observable initialLoading = true
  @observable lastFocusedWindowId = null

  updateHandler = null

  @computed
  get tabCount () {
    return this.windows
      .map(x => x.tabs.length)
      .reduce((acc, cur) => acc + cur, 0)
  }

  @computed
  get tabs () {
    return [].concat(...this.windows.map(x => x.tabs.slice()))
  }

  @action
  removeTabs = ids => {
    const set = new Set(ids)
    this.windows.forEach(win => win.removeTabs(set))
  }

  @action
  updateAllWindows = () => {
    if (this.updateHandler != null) {
      clearTimeout(this.updateHandler)
    }
    this.updateHandler = setTimeout(this.getAllWindows, 50)
  }

  @action
  selectAll = () => {
    this.store.tabStore.selectAll(this.tabs)
  }

  @computed
  get lastFocusedWindow () {
    return this.windows.find(x => x.lastFocused)
  }

  focusLastActiveTab = () => {
    if (!this.lastFocusedWindow) {
      return
    }
    if (this.store.searchStore.focusedWinIndex !== -1) {
      return
    }
    this.store.searchStore.firstTab()
  }

  getTargetWindow = windowId => {
    const win = this.windows.find(win => win.id === windowId)
    if (!win) {
      throw new Error(
        `getTargetWindow canot find window for windowId: ${windowId}!`
      )
    }
    return win
  }

  @action
  moveTabs = async (tabs, windowId, from = 0) => {
    const targetWindow = this.getTargetWindow(windowId)
    tabs.map((tab, i) => {
      const index = from + (from !== -1 ? i : 0)
      const sourceWindow = this.getTargetWindow(tab.windowId)
      sourceWindow.remove(tab)
      targetWindow.add(tab, index)
    })
    await moveTabs(tabs, windowId, from)
  }

  getAllWindows = () => {
    console.log('getAllWindows')
    chrome.windows.getAll({ populate: true }, async (windows = []) => {
      console.log('getAllWindows get', windows)
      this.lastFocusedWindowId = await getLastFocusedWindowId()

      this.windows = windows
        .filter(notSelfPopup)
        .map(win => new Window(win, this.store))
        .sort(windowComparator)

      this.focusLastActiveTab()

      this.initialLoading = false
    })
  }
}
