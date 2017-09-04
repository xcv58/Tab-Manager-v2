import { action, computed, observable } from 'mobx'

class WindowsStore {
  constructor () {
    this.updateAllWindows()
  }

  @observable windows = []
  @observable windowsMap = new Map()
  @observable tabsMap = new Map()

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
    chrome.windows.getAll({ populate: true }, this.allWindows)
  }

  @action
  allWindows = (windows) => {
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
}

export default new WindowsStore()
