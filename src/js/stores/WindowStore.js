import { action, computed, observable } from 'mobx'
import { windowComparator } from '../libs'

export default class WindowsStore {
  constructor (store) {
    this.store = store
    this.getAllWindows()
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

  getAllWindows = async () => {
    if (!this.lastFocusedWindowId) {
      const lastFocusedWindow = await chrome.windows.getLastFocused({})
      this.lastFocusedWindowId = lastFocusedWindow.id
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
