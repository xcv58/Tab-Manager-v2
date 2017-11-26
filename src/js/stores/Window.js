import { computed, observable } from 'mobx'
import Tab from './Tab'

export default class Window {
  constructor (win, store) {
    this.store = store
    Object.assign(this, win)
    this.tabs = win.tabs.map(tab => new Tab(tab, store))
  }

  @observable tabs = []

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
    return !this.allTabSelected &&
    this.tabs.some(
      this.store.tabStore.isTabSelected
    )
  }
}
