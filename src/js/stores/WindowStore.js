import { action, computed, observable } from 'mobx'
import { getLastFocusedWindowId, windowComparator } from 'libs'
import Window from './Window'

export default class WindowsStore {
  constructor (store) {
    this.store = store
    this.init()
  }

  @observable windows = []
  @observable initialLoading = true

  init = async () => {
    this.lastFocusedWindowId = await getLastFocusedWindowId()
  }

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
  get width () {
    const { length } = this.windows
    if (length === 0) {
      return '100%'
    }
    if (length <= 4) {
      return `${100 / (length)}%`
    }
    return '18rem'
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

  getAllWindows = () => {
    chrome.windows.getAll(
      { populate: true },
      (windows = []) => {
        this.windows = windows
        .map((win) => new Window(win, this.store))
        .sort(windowComparator)
        this.initialLoading = false
      }
    )
  }
}
