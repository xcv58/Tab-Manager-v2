import { action, computed, observable } from 'mobx'

export default class WindowsStore {
  constructor (store) {
    this.store = store
    this.getAllWindows()
  }

  @observable windows = []
  @observable windowsMap = new Map()
  @observable tabsMap = new Map()

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
    this.updateHandler = setTimeout(this.getAllWindows, 2)
  }

  getAllWindows = () => {
    chrome.windows.getAll(
      { populate: true },
      (windows) => {
        this.windows = windows
        this.windowsMap.clear()
        this.tabsMap.clear()
        windows.map((win) => {
          const { id, tabs } = win
          this.windowsMap.set(id, win)
          tabs.map((tab) => {
            this.tabsMap.set(tab.id, tab)
          })
        })
      }
    )
  }
}
