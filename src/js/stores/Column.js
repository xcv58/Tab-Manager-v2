import { action, computed, observable } from 'mobx'
// import Tab from './Tab'

export default class Column {
  constructor (store, win) {
    this.store = store
    // this.showTabs = !this.store.windowStore.initialLoading
    if (win) {
      this.windows.push(win)
    }
  }

  @observable windows = []

  @computed
  get length () {
    return this.windows.reduce((acc, cur) => acc + cur.length, 0)
  }

  @computed
  get tabs () {
    return [].concat(...this.windows.map(x => x.tabs.slice()))
  }

  @computed
  get matchedTabs () {
    return [].concat(...this.windows.map(x => x.matchedTabs))
  }

  @action
  add = win => {
    this.windows.push(win)
  }

  @action
  getTabIdForIndex = index => {
    const delta = []
    let preHeight = 0
    for (let i = 0; i < this.windows.length; i++) {
      const win = this.windows[i]
      for (let j = 0; j < win.matchedTabs.length; j++) {
        delta.push(Math.abs(win.matchedTabs[j].index + preHeight - index))
      }
      preHeight += win.length
    }
    const target = delta.indexOf(Math.min(...delta))
    return this.matchedTabs[target].id
  }

  @action
  getVisibleIndex = tabId => {
    let preHeight = 0
    for (let i = 0; i < this.windows.length; i++) {
      const win = this.windows[i]
      for (let j = 0; j < win.matchedTabs.length; j++) {
        const tab = win.matchedTabs[j]
        if (tab.id === tabId) {
          return tab.index + preHeight
        }
      }
      preHeight += win.length
    }
    return 0
  }
}
