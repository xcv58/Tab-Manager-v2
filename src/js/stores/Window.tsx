import { action, computed, observable } from 'mobx'
import Tab from './Tab'
import { browser } from 'libs'
import Store from 'stores'
import log from 'libs/log'
import Focusable from './Focusable'

export default class Window extends Focusable {
  store: Store

  constructor (win, store: Store) {
    super(store)
    this.store = store
    Object.assign(this, win)
    this.tabs = win.tabs.map((tab) => new Tab(tab, store, this))
    // TODO: Remove this when we add concurrent mode
    this.showTabs = !this.store.windowStore.initialLoading
  }

  @observable
  tabs: Tab[] = []

  // TODO: Remove this when we add concurrent mode
  @observable
  showTabs

  @observable
  type

  @action
  tabMounted = () => {
    this.tabs
      .filter((x) => !x.isVisible && !x.showTab)
      .forEach((x) => (x.showTab = true))
    const tab = this.tabs.find((x) => !x.showTab)
    if (tab) {
      tab.showTab = true
    }
  }

  @action
  activate = () => {
    browser.windows.update(this.id, { focused: true })
  }

  @computed
  get hide () {
    return this.store.hiddenWindowStore.hiddenWindows[this.id]
  }

  @computed
  get visibleLength () {
    if (this.hide) {
      return 2
    }
    const { length } = this.tabs.filter((x) => x.isVisible)
    return length ? length + 2 : length
  }

  @computed
  get lastFocused () {
    return this.id === this.store.windowStore.lastFocusedWindowId
  }

  @computed
  get canDrop () {
    return !['popup', 'devtools'].includes(this.type)
  }

  @computed
  get invisibleTabs () {
    if (this.hide) {
      return this.tabs
    }
    return this.tabs.filter((x) => !x.isVisible)
  }

  @computed
  get disableSelectAll () {
    if (this.hide) {
      return true
    }
    return this.matchedTabs.length === 0
  }

  @computed
  get matchedTabs () {
    if (this.hide) {
      return []
    }
    return this.tabs.filter((x) => x.isMatched)
  }

  @computed
  get allTabSelected () {
    return (
      !this.disableSelectAll &&
      this.matchedTabs.every(this.store.tabStore.isTabSelected)
    )
  }

  @computed
  get someTabSelected () {
    return (
      !this.allTabSelected && this.tabs.some(this.store.tabStore.isTabSelected)
    )
  }

  getTab = (index) => {
    if (index < 0 || index >= this.tabs.length) {
      return null
    }
    return this.tabs[index]
  }

  @action
  add = (tab, index) => {
    if (index < 0 || index > this.tabs.length + 1) {
      throw new Error(`[Window-Store.add] get invalid index: "${index}"!`)
    }
    this.tabs.splice(index, 0, tab)
  }

  @action
  remove = (tab) => {
    const index = this.tabs.findIndex((x) => x.id === tab.id)
    if (index !== -1) {
      this.tabs.splice(index, 1)
    } else {
      throw new Error(
        `[Window-Store.remove] get invalid tab: ${JSON.stringify(tab)}!`
      )
    }
  }

  @action
  removeTabs = (set) => {
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

  @action
  reload = () => {
    this.tabs.forEach((tab) => tab.reload())
  }

  @action
  close = () => {
    browser.windows.remove(this.id)
  }

  closeWindow = this.close

  @action
  toggleSelectAll = () => {
    log.debug('toggleSelectAll')
    const { allTabSelected, matchedTabs } = this
    const { selectAll, unselectAll } = this.store.tabStore
    if (allTabSelected) {
      unselectAll(matchedTabs)
    } else {
      selectAll(matchedTabs)
    }
  }

  select = this.toggleSelectAll

  @action
  onMoved = (tabId, moveInfo) => {
    const { fromIndex, toIndex } = moveInfo
    const toTab = this.getTab(toIndex)
    if (!toTab) {
      return false
    }
    if (toTab.id === tabId) {
      return true
    }
    const fromTab = this.getTab(fromIndex)
    if (!fromTab || fromTab.id !== tabId) {
      return false
    }
    this.tabs[fromIndex] = toTab
    this.tabs[toIndex] = fromTab
    return true
  }

  @action
  onDetached = (tabId, detachInfo) => {
    const { oldPosition } = detachInfo
    const oldTab = this.getTab(oldPosition)
    if (oldTab && oldTab.id === tabId) {
      this.tabs.splice(oldPosition, 1)
    }
  }

  @action
  onAttched = async (tabId, attachInfo) => {
    const { newPosition } = attachInfo
    const tab = this.getTab(newPosition)
    if (tab && tab.id === tabId) {
      return
    }
    const tabInfo = await browser.tabs.get(tabId)
    if (!tabInfo) {
      return false
    }
    this.tabs.splice(newPosition, 0, new Tab(tabInfo, this.store, this))
  }

  @action
  toggleHide = () => {
    if (this.hide) {
      this.store.hiddenWindowStore.showWindow(this.id)
    } else {
      this.store.hiddenWindowStore.hideWindow(this.id)
      this.store.focusStore.focus(this)
    }
  }
}
