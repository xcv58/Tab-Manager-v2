import { action, computed, observable } from 'mobx'
import { getLastFocusedWindowId, windowComparator } from '../libs'

export default class WindowsStore {
  constructor (store) {
    this.store = store
  }

  @observable windows = []

  updateHandler = null

  @computed
  get tabCount () {
    return this.windows
    .map(
      x => x.tabs.length
    ).reduce(
      (acc, cur) => acc + cur, 0
    )
  }

  @computed
  get tabs () {
    return [].concat(...(this.windows.map(x => x.tabs.slice())))
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

  getAllWindows = async () => {
    if (!this.lastFocusedWindowId) {
      this.lastFocusedWindowId = await getLastFocusedWindowId()
    }
    const windows = await chrome.windows.getAll({ populate: true })
    this.windows = windows.map((win) => {
      return {
        ...win,
        lastFocused: this.lastFocusedWindowId === win.id
      }
    }).sort(windowComparator)
  }
}
