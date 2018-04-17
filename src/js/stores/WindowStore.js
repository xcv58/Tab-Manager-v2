import { action, computed, observable } from 'mobx'
import {
  moveTabs,
  getLastFocusedWindowId,
  notSelfPopup,
  windowComparator
} from 'libs'
import Window from './Window'

const DEBOUNCE_INTERVAL = 2000

export default class WindowsStore {
  constructor (store) {
    this.store = store
  }

  @observable windows = []
  @observable initialLoading = true
  @observable lastFocusedWindowId = null

  lastCallTime = 0
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
    for (let index = 0; index < this.windows.length;) {
      if (this.windows[index].tabs.length === 0) {
        this.windows.splice(index, 1)
      } else {
        index++
      }
    }
  }

  @action
  updateAllWindows = () => {
    const time = Date.now()
    if (this.updateHandler != null) {
      clearTimeout(this.updateHandler)
    }
    if (time - this.lastCallTime < DEBOUNCE_INTERVAL) {
      this.updateHandler = setTimeout(this.getAllWindows, DEBOUNCE_INTERVAL)
    } else {
      this.getAllWindows()
    }
    this.lastCallTime = time
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
    chrome.windows.getAll({ populate: true }, async (windows = []) => {
      this.lastFocusedWindowId = await getLastFocusedWindowId()

      this.windows = windows
        .filter(notSelfPopup)
        .map(win => new Window(win, this.store))
        .sort(windowComparator)

      this.focusLastActiveTab()

      this.initialLoading = false
      this.updateHandler = null
    })
  }
}
