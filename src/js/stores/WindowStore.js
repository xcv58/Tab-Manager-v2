import { action, computed, observable } from 'mobx'
import { getLastFocusedWindowId, notSelfPopup, windowComparator } from 'libs'
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

  focusLastActiveTab = () => {
    if (this.windows.length <= 0) {
      return
    }
    const tab = this.windows[0].tabs.find(x => x.active)
    if (tab) {
      this.store.searchStore.focus(tab)
    }
  }

  getAllWindows = () => {
    chrome.windows.getAll(
      { populate: true },
      async (windows = []) => {
        this.lastFocusedWindowId = await getLastFocusedWindowId()

        this.windows = windows
        .filter(notSelfPopup)
        .map((win) => new Window(win, this.store))
        .sort(windowComparator)

        this.focusLastActiveTab()

        this.initialLoading = false
      }
    )
  }
}
