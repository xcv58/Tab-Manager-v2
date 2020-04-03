import { action, computed, observable } from 'mobx'
import { activateTab } from 'libs'
import Store from 'stores'
import log from 'libs/log'

export default class FocusStore {
  store: Store

  constructor (store) {
    this.store = store
  }

  @observable
  focusedTab = null

  @observable
  focusedWindowId = null

  @computed
  get matchedColumns () {
    return this.store.windowStore.columns.filter((column) => {
      if (column.matchedTabs.length) {
        return column
      }
      return null
    })
  }

  @computed
  get focusedColIndex () {
    return this.matchedColumns.findIndex((column) =>
      column.matchedTabs.find((tab) => tab.id === this.focusedTab)
    )
  }

  @computed
  get focusedColumn () {
    if (this.focusedColIndex === -1) {
      return null
    }
    return this.matchedColumns[this.focusedColIndex]
  }

  @computed
  get focusedColTabIndex () {
    if (!this.focusedColumn) {
      return -1
    }
    return this.focusedColumn.matchedTabs.findIndex(
      (tab) => tab.id === this.focusedTab
    )
  }

  @action
  defocusTab = () => {
    this.focusedTab = null
    this.focusedWindowId = null
  }

  @action
  enter = () => {
    activateTab(this.focusedTab)
  }

  @action
  focus = (tab) => {
    this.focusedTab = tab.id
  }

  @action
  select = () => {
    if (!this.focusedTab) {
      return
    }
    const {
      tabStore: { select },
      windowStore: { tabs }
    } = this.store
    select(tabs.find((x) => x.id === this.focusedTab))
  }

  @action
  closeWindow = () => {
    if (!this.focusedTab) {
      return
    }
    const {
      windowStore: { tabs }
    } = this.store
    const tab = tabs.find((x) => x.id === this.focusedTab)
    if (tab) {
      tab.win.close()
    }
  }

  @action
  selectWindow = () => {
    if (!this.focusedTab) {
      return
    }
    const {
      windowStore: { tabs }
    } = this.store
    const tab = tabs.find((x) => x.id === this.focusedTab)
    if (tab) {
      tab.win.toggleSelectAll()
    }
  }

  @action
  groupTab = () => {
    const tab = this.store.windowStore.tabs.find(
      (x) => x.id === this.focusedTab
    )
    if (tab) {
      tab.groupTab()
    }
  }

  @action
  left = () => this.jumpToHorizontalTab(-1)

  @action
  right = () => this.jumpToHorizontalTab(1)

  jumpInSameCol = (direction, side = false) => {
    if (this.jumpOrFocusTab(direction)) {
      const { matchedTabs } = this.focusedColumn
      const { length } = matchedTabs
      let index = this.focusedColTabIndex + direction + length
      if (side) {
        index = direction * (length - 1)
      }
      this.focusedTab = matchedTabs[index % length].id
    }
  }

  jumpToHorizontalTab = (direction) => {
    if (this.jumpOrFocusTab(direction)) {
      const columns = this.matchedColumns
      const { length } = columns
      this.jumpToColumn(
        this.focusedColumn.getVisibleIndex(this.focusedTab),
        columns[(this.focusedColIndex + length + direction) % length]
      )
    }
  }

  jumpOrFocusTab = (direction) => {
    if (!this.focusedTab) {
      this.findFocusedTab()
      return
    }
    if (this.focusedColIndex < 0 || this.focusedColTabIndex < 0) {
      this.findFocusedTab(direction)
      return
    }
    if (!this.focusedTab) {
      this.jumpToTab(0)
      return
    }
    return true
  }

  jumpToColumn = (index, column) => {
    this.focusedTab = column.getTabIdForIndex(index)
  }

  @action
  up = () => this.jumpInSameCol(-1)

  @action
  down = () => this.jumpInSameCol(1)

  @action
  firstTab = () => this.jumpInSameCol(0, true)

  @action
  lastTab = () => this.jumpInSameCol(1, true)

  findFocusedTab = (step = 1) => {
    const { length } = this.store.searchStore.matchedTabs
    if (length === 0) {
      return
    }
    if (this.focusedTab) {
      const index = this.store.searchStore.matchedTabs.findIndex(
        (x) => x.id === this.focusedTab
      )
      this.jumpToTab(index + step)
    } else {
      const index = (length + (step - 1) / 2) % length
      this.jumpToTab(index)
    }
  }

  jumpToTab = (index = 0) => {
    const { length } = this.store.searchStore.matchedTabs
    if (length === 0) {
      return
    }
    const newIndex = (length + index) % length
    this.focusedTab = this.store.searchStore.matchedTabs[newIndex].id
  }

  setDefaultFocusedTab = () => {
    log.debug('setDefaultFocusedTab:', { focusedTab: this.focusedTab })
    if (this.focusedTab) {
      return
    }
    const { lastFocusedWindow } = this.store.windowStore
    if (!lastFocusedWindow) {
      log.debug('setDefaultFocusedTab no lastFocusedWindow:', {
        lastFocusedWindow
      })
      return
    }
    const tab = lastFocusedWindow.tabs.find((x) => x.active)
    log.debug('setDefaultFocusedTab active tab:', { tab })
    if (tab) {
      this.focus(tab)
    }
  }

  toggleHideForFocusedWindow = () => {
    if (this.focusedTab) {
      const {
        windowStore: { tabs }
      } = this.store
      const tab = tabs.find((x) => x.id === this.focusedTab)
      tab.win.toggleHide()
    } else if (this.focusedWindowId) {
      const win = this.store.windowStore.windows.find(
        (x) => x.id === this.focusedWindowId
      )
      if (win) {
        win.toggleHide()
      }
    }
  }

  @action
  focusWindow = (windowId) => {
    this.focusedTab = null
    this.focusedWindowId = windowId
  }
}
