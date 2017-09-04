import { action, computed, observable } from 'mobx'
import { moveTabs } from '../libs'

export default class WindowsStore {
  constructor (store) {
    this.store = store
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

  @action
  getTabs = () => {
    return [].concat(...(this.windows.map(x => x.tabs.slice())))
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

  @action
  sortTabs = () => {
    const tabs = this.getTabs()
    tabs.sort((a, b) => {
      if (a.url === b.url) {
        return a.title.localeCompare(b.title)
      }
      return a.url.localeCompare(b.url)
    })
    // console.log(this.windows[0]);
    moveTabs(tabs, this.windows[0].id)
  }

  @computed
  get duplicatedTabs () {
    const urlTabMap = this.tabs.reduce((acc, tab) => {
      const { url } = tab
      acc[url] = acc[url] || []
      acc[url].push(tab)
      return acc
    }, {})
    return Object.values(urlTabMap).filter(x => x.length > 1)
  }

  @computed
  get duplicatedTabsCount () {
    return this.duplicatedTabs.map(x => x.length).reduce((acc, num) => acc + num, 0)
  }

  @action
  deduplicate = () => {
    if (this.duplicatedTabs.length === 0) {
      return
    }

    chrome.windows.create({ tabId: this.duplicatedTabs[0][0].id }, (win) => {
      const { id } = win
      this.duplicatedTabs.map((tabs) => {
        moveTabs(tabs, id, -1)
      })
    })
  }
}
