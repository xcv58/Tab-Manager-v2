import { computed, observable } from 'mobx'
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

  // @action
  add = win => {
    this.windows.push(win)
  }

  // @observable id
  // @observable showTabs
  // @observable type

  // @action
  // tabMounted = () => {
  //   const tab = this.tabs.find(x => !x.showTab)
  //   if (tab) {
  //     tab.showTab = true
  //   }
  // }
  //
  // @action
  // onTitleClick = () => {
  //   chrome.windows.update(this.id, { focused: true })
  // }
  //
  // @computed
  // get lastFocused () {
  //   return this.id === this.store.windowStore.lastFocusedWindowId
  // }
  //
  // @computed
  // get canDrop () {
  //   return !['popup', 'devtools'].includes(this.type)
  // }
  //
  // @computed
  // get invisibleTabs () {
  //   return this.tabs.filter(x => !x.isVisible)
  // }
  //
  // @computed
  // get disableSelectAll () {
  //   return this.matchedTabs.length === 0
  // }
  //
  // @computed
  // get matchedTabs () {
  //   return this.tabs.filter(x => x.isMatched)
  // }
  //
  // @computed
  // get allTabSelected () {
  //   return (
  //     !this.disableSelectAll &&
  //     this.matchedTabs.every(this.store.tabStore.isTabSelected)
  //   )
  // }
  //
  // @computed
  // get someTabSelected () {
  //   return (
  //     !this.allTabSelected && this.tabs.some(this.store.tabStore.isTabSelected)
  //   )
  // }
  //
  // @action
  // add = (tab, index) => {
  //   if (index < 0 || index > this.tabs.length) {
  //     throw new Error(`[Window-Store.add] get invalid index: "${index}"!`)
  //   }
  //   this.tabs.splice(index, 0, tab)
  // }
  //
  // @action
  // remove = tab => {
  //   const index = this.tabs.findIndex(x => x.id === tab.id)
  //   if (index !== -1) {
  //     this.tabs.splice(index, 1)
  //   } else {
  //     throw new Error(
  //       `[Window-Store.remove] get invalid tab: ${JSON.stringify(tab)}!`
  //     )
  //   }
  // }
  //
  // @action
  // removeTabs = set => {
  //   for (let index = 0; index < this.tabs.length;) {
  //     const id = this.tabs[index].id
  //     if (set.has(id)) {
  //       this.tabs.splice(index, 1)
  //       set.delete(id)
  //     } else {
  //       index++
  //     }
  //   }
  // }
}
