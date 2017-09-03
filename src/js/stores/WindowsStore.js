import { action, computed, observable } from 'mobx'

class WindowsStore {
  constructor () {
    chrome.windows.getAll({ populate: true }, this.allWindows)
  }

  @observable windows = []
  @observable windowsbyid = {}
  @observable tabsbyid = {}

  @computed get tabCount () {
    return this.windows
    .map(
      x => x.tabs.length
    ).reduce(
      (acc, cur) => acc + cur, 0
    )
  }

  @action
  allWindows = (windows) => {
    console.log(windows)
    this.windows = windows
    windows.map((win) => {
      const { id, tabs } = win
      this.windowsbyid[id] = win
      tabs.map((tab) => {
        this.tabsbyid[tab.id] = tab
      })
    })
  }
}

const windowsStore = new WindowsStore()

export default windowsStore
