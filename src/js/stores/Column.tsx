import { action, computed, observable } from 'mobx'
import Store from 'stores'

export default class Column {
  store: Store

  constructor (store: Store, win?: Object) {
    this.store = store
    if (win) {
      this.windows.push(win)
    }
  }

  @observable
  windows = []

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

  clearWindow = () => {
    for (let index = 0; index < this.windows.length;) {
      if (this.windows[index].tabs.length === 0) {
        this.windows.splice(index, 1)
      } else {
        index++
      }
    }
  }

  getHeight = (tab, j) => {
    if (this.store.userStore.showUnmatchedTab) {
      return tab.index
    }
    return j
  }

  @action
  getTabIdForIndex = index => {
    const delta = []
    let preHeight = 1
    for (let i = 0; i < this.windows.length; i++) {
      const win = this.windows[i]
      for (let j = 0; j < win.matchedTabs.length; j++) {
        delta.push(
          Math.abs(this.getHeight(win.matchedTabs[j], j) + preHeight - index)
        )
      }
      preHeight += win.visibleLength
    }
    const target = delta.indexOf(Math.min(...delta))
    return this.matchedTabs[target].id
  }

  @action
  getVisibleIndex = tabId => {
    let preHeight = 1
    for (let i = 0; i < this.windows.length; i++) {
      const win = this.windows[i]
      for (let j = 0; j < win.matchedTabs.length; j++) {
        const tab = win.matchedTabs[j]
        if (tab.id === tabId) {
          return this.getHeight(tab, j) + preHeight
        }
      }
      preHeight += win.visibleLength
    }
    return 0
  }
}
