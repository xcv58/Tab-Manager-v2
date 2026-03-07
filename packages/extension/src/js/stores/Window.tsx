import { action, computed, observable, makeObservable } from 'mobx'
import Tab from './Tab'
import { browser } from 'libs'
import Store from 'stores'
import log from 'libs/log'
import Focusable from './Focusable'
import type { WindowRow } from './TabGroupStore'

export default class Window extends Focusable {
  store: Store

  constructor(win, store: Store) {
    super(store)

    makeObservable(this, {
      tabs: observable,
      showTabs: observable,
      type: observable,
      activate: action,
      hide: computed,
      visibleLength: computed,
      rows: computed,
      lastFocused: computed,
      canDrop: computed,
      invisibleTabs: computed,
      disableSelectAll: computed,
      matchedTabs: computed,
      allTabSelected: computed,
      someTabSelected: computed,
      add: action,
      remove: action,
      removeTabs: action,
      reload: action,
      close: action,
      toggleSelectAll: action,
      onMoved: action,
      onDetached: action,
      onAttched: action,
      toggleHide: action,
    })

    this.store = store
    Object.assign(this, win)
    this.tabs = (win.tabs || [])
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((tab) => new Tab(tab, store, this))
    // TODO: Remove this when we add concurrent mode
    this.showTabs = !this.store.windowStore.initialLoading
  }

  tabs: Tab[] = []

  // TODO: Remove this when we add concurrent mode
  showTabs = false

  type = ''

  activate = () => {
    browser.windows.update(this.id, { focused: true })
  }

  get hide() {
    return this.store.hiddenWindowStore.hiddenWindows[this.id]
  }

  get visibleLength() {
    if (this.hide) {
      return 2
    }
    const { length } = this.rows
    return length ? length + 2 : length
  }

  get rows(): WindowRow[] {
    if (this.store.tabGroupStore?.hasTabGroupsApi?.()) {
      return this.store.tabGroupStore.getRowsForWindow(this)
    }
    return this.tabs
      .filter((x) => x.isVisible)
      .map((tab) => ({
        kind: 'tab' as const,
        tabId: tab.id,
        windowId: tab.windowId,
        groupId: tab.groupId,
        hiddenByCollapse: false,
      }))
  }

  get lastFocused() {
    return this.id === this.store.windowStore.lastFocusedWindowId
  }

  get canDrop() {
    return !['popup', 'devtools'].includes(this.type)
  }

  get invisibleTabs() {
    if (this.hide) {
      return this.tabs
    }
    return this.tabs.filter((x) => !x.isVisible)
  }

  get disableSelectAll() {
    if (this.hide) {
      return true
    }
    return this.matchedTabs.length === 0
  }

  get matchedTabs() {
    if (this.hide) {
      return []
    }
    return this.tabs.filter((x) => x.isMatched)
  }

  get allTabSelected() {
    return (
      !this.disableSelectAll &&
      this.matchedTabs.every(this.store.tabStore.isTabSelected)
    )
  }

  get someTabSelected() {
    return (
      !this.allTabSelected && this.tabs.some(this.store.tabStore.isTabSelected)
    )
  }

  getTab = (index: number) => {
    if (index < 0 || index >= this.tabs.length) {
      return null
    }
    return this.tabs[index]
  }

  getTabById = (tabId: number) => {
    return this.tabs.find((x) => x.id === tabId)
  }

  add = (tab: Tab, index: number) => {
    if (index < 0 || index > this.tabs.length + 1) {
      throw new Error(`[Window-Store.add] get invalid index: "${index}"!`)
    }
    this.tabs.splice(index, 0, tab)
  }

  remove = (tab: Tab) => {
    const index = this.tabs.findIndex((x) => x.id === tab.id)
    if (index !== -1) {
      this.tabs.splice(index, 1)
    } else {
      throw new Error(
        `[Window-Store.remove] get invalid tab: ${JSON.stringify(tab)}!`,
      )
    }
  }

  removeTabs = (set) => {
    for (let index = 0; index < this.tabs.length; ) {
      const id = this.tabs[index].id
      if (set.has(id)) {
        this.tabs.splice(index, 1)
        set.delete(id)
      } else {
        index++
      }
    }
  }

  reload = () => {
    this.tabs.forEach((tab) => tab.reload())
  }

  close = () => {
    browser.windows.remove(this.id)
  }

  closeWindow = this.close

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

  onMoved = (tabId: number, moveInfo) => {
    const { fromIndex, toIndex } = moveInfo
    const fromTab = this.getTab(fromIndex)
    if (!fromTab || fromTab.id !== tabId) {
      return false
    }
    if (fromIndex === toIndex) {
      return true
    }
    if (toIndex < 0 || toIndex >= this.tabs.length) {
      return false
    }
    this.tabs.splice(fromIndex, 1)
    this.tabs.splice(toIndex, 0, fromTab)
    this.tabs.forEach((tab, index) => {
      tab.index = index
    })
    return true
  }

  onDetached = (tabId: number, detachInfo) => {
    const { oldPosition } = detachInfo
    const oldTab = this.getTab(oldPosition)
    if (oldTab && oldTab.id === tabId) {
      this.tabs.splice(oldPosition, 1)
      return
    }
    const existingIndex = this.tabs.findIndex((tab) => tab.id === tabId)
    if (existingIndex !== -1) {
      this.tabs.splice(existingIndex, 1)
    }
  }

  onAttched = async (tabId: number, attachInfo) => {
    const { newPosition } = attachInfo
    let targetPosition = Math.max(0, Math.min(newPosition, this.tabs.length))
    const existingIndex = this.tabs.findIndex((tab) => tab.id === tabId)
    if (existingIndex === targetPosition) {
      return
    }
    let tabToInsert: Tab | null = null
    if (existingIndex !== -1) {
      ;[tabToInsert] = this.tabs.splice(existingIndex, 1)
      if (existingIndex < targetPosition) {
        targetPosition -= 1
      }
    } else {
      const tabInfo = await browser.tabs.get(tabId)
      if (!tabInfo) {
        return false
      }
      tabToInsert = new Tab(tabInfo, this.store, this)
    }
    this.tabs.splice(targetPosition, 0, tabToInsert)
  }

  toggleHide = () => {
    if (this.hide) {
      this.store.hiddenWindowStore.showWindow(this.id)
    } else {
      this.store.hiddenWindowStore.hideWindow(this.id)
      this.store.focusStore.focus(this)
    }
    this.store.windowStore.markLayoutDirtyIfNeeded('window-toggle', this.id)
  }
}
