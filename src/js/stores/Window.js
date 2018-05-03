import { action, computed, observable } from 'mobx'
import Tab from './Tab'

export default class Window {
  constructor (win, store) {
    this.store = store
    Object.assign(this, win)
    this.tabs = win.tabs.map(tab => new Tab(tab, store))
    this.showTabs = !this.store.windowStore.initialLoading
  }

  @observable tabs = []
  @observable id
  @observable showTabs

  @computed
  get lastFocused () {
    return this.id === this.store.windowStore.lastFocusedWindowId
  }

  @computed
  get allTabSelected () {
    return this.tabs.every(this.store.tabStore.isTabSelected)
  }

  @computed
  get someTabSelected () {
    return (
      !this.allTabSelected && this.tabs.some(this.store.tabStore.isTabSelected)
    )
  }

  @action
  add = (tab, index) => {
    if (index < 0 || index > this.tabs.length) {
      throw new Error(`[Window-Store.add] get invalid index: "${index}"!`)
    }
    this.tabs.splice(index, 0, tab)
  }

  @action
  remove = tab => {
    const index = this.tabs.findIndex(x => x.id === tab.id)
    if (index !== -1) {
      this.tabs.splice(index, 1)
    } else {
      throw new Error(
        `[Window-Store.remove] get invalid tab: ${JSON.stringify(tab)}!`
      )
    }
  }

  @action
  removeTabs = set => {
    for (let index = 0; index < this.tabs.length;) {
      const id = this.tabs[index].id
      if (set.has(id)) {
        this.tabs.splice(index, 1)
        set.delete(id)
      } else {
        index++
      }
    }
  }
}
