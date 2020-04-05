import { action, computed, observable } from 'mobx'
import Store from 'stores'
import log from 'libs/log'
import Tab from './Tab'
import Window from './Window'

type FocusedItem = Tab | Window

// 1. No previous item -> just add
// 2. Has previous item with the same left ->
//      check the delta by Math.abs() and replace it by the smaller one
// 3. Has previous item with different left -> just add
const getItemsInRow = (
  previousItem: FocusedItem,
  item: FocusedItem,
  baseRect
): FocusedItem[] => {
  const rect = item.getBoundingClientRect()
  if (!rect) {
    return [previousItem]
  }
  if (!previousItem) {
    return [item]
  }
  const preRect = previousItem.getBoundingClientRect()
  if (preRect.left !== rect.left) {
    return [previousItem, item]
  }
  const preDelta = Math.abs(baseRect.top - preRect.top)
  const curDelta = Math.abs(baseRect.top - rect.top)
  if (curDelta < preDelta) {
    return [item]
  }
  return [previousItem]
}

export default class FocusStore {
  store: Store

  constructor (store) {
    this.store = store
  }

  @computed
  get focusedItem (): FocusedItem | null {
    const { windows, tabs } = this.store.windowStore
    if (this.focusedTabId) {
      return tabs.find((x) => x.id === this.focusedTabId && x.isVisible)
    } else if (this.focusedWindowId) {
      return windows.find((x) => x.id === this.focusedWindowId)
    }
  }

  @observable
  focusedWindowId = null

  @observable
  focusedTabId = null

  _setFocusedItem = (item: FocusedItem) => {
    if (item instanceof Window) {
      this.focusedTabId = null
      this.focusedWindowId = item.id
    } else if (item instanceof Tab) {
      this.focusedTabId = item.id
      this.focusedWindowId = null
    } else {
      log.error(
        'invalid input item for _setFocusedItem, it is not Window nor Tab:',
        { item }
      )
    }
  }

  @action
  defocus = () => {
    this.focusedTabId = null
    this.focusedWindowId = null
  }

  @action
  enter = () => {
    if (this.focusedItem) {
      this.focusedItem.activate()
    }
  }

  @action
  focus = (item: FocusedItem) => {
    this._setFocusedItem(item)
  }

  // Toggle select of focused tab, or the focused window.tabs
  @action
  select = () => {
    if (this.focusedItem) {
      this.focusedItem.select()
    }
  }

  @action
  closeWindow = () => {
    if (this.focusedItem) {
      this.focusedItem.closeWindow()
    }
  }

  @action
  selectWindow = () => {
    if (this.focusedItem) {
      this.focusedItem.toggleSelectAll()
    }
  }

  @action
  groupTab = () => {
    const { focusedItem } = this
    if (!focusedItem) {
      return
    }
    if (focusedItem instanceof Tab) {
      focusedItem.groupTab()
    }
  }

  _getBaseRect = () => {
    if (!this.focusedItem) {
      return
    }
    return this.focusedItem.getBoundingClientRect()
  }

  _findColumn = () => {
    const { focusedItem } = this
    const baseRect = this._getBaseRect()
    log.debug('_findColumn:', { focusedItem, baseRect })
    if (!focusedItem || !baseRect) {
      return
    }
    const { windows } = this.store.windowStore
    const column = []
    for (const win of windows) {
      const rect = win.getBoundingClientRect()
      if (!rect) {
        continue
      }
      log.debug('win:', win, rect)
      if (baseRect.left === rect.left) {
        if (win.hide) {
          column.push(win)
        } else {
          column.push(...win.matchedTabs)
        }
      }
    }
    return column
  }

  _findRow = () => {
    const { focusedItem } = this
    const baseRect = this._getBaseRect()
    log.debug('_findRow:', { focusedItem, baseRect })
    if (!focusedItem || !baseRect) {
      return
    }
    const { windows } = this.store.windowStore
    const row: FocusedItem[] = []
    for (const win of windows) {
      for (const item of win.hide ? [win] : win.matchedTabs) {
        const items = getItemsInRow(row.pop(), item, baseRect)
        row.push(...items)
      }
    }
    return row
  }

  _jump = (items: FocusedItem[], direction, side = false) => {
    if (!items) {
      return this._focusOnFirstItem()
    }
    const index = items.findIndex((x) => x === this.focusedItem)
    let nextIndex = index + direction + items.length
    if (side) {
      nextIndex = direction * (items.length - 1)
    }
    this._setFocusedItem(items[nextIndex % items.length])
  }

  _jumpInSameCol = (direction, side = false) => {
    const { focusedItem } = this
    log.debug('_jumpInSameCol:', { direction, side, focusedItem })
    if (!focusedItem) {
      return this._focusOnFirstItem()
    }
    const column = this._findColumn()
    log.debug('column:', { column })
    this._jump(column, direction, side)
  }

  _jumpInSameRow = (direction) => {
    const { focusedItem } = this
    log.debug('_jumpInSameRow:', { direction, focusedItem })
    if (!focusedItem) {
      return this._focusOnFirstItem()
    }
    const row = this._findRow()
    log.debug('row:', { row })
    this._jump(row, direction)
  }

  @action
  left = () => {
    log.debug('left')
    this._jumpInSameRow(-1)
  }

  @action
  right = () => {
    log.debug('right')
    this._jumpInSameRow(1)
  }

  @action
  up = () => {
    log.debug('up')
    this._jumpInSameCol(-1)
  }

  @action
  down = () => {
    log.debug('down')
    this._jumpInSameCol(1)
  }

  @action
  firstTab = () => {
    log.debug('firstTab')
    this._jumpInSameCol(0, true)
  }

  @action
  lastTab = () => {
    log.debug('lastTab')
    this._jumpInSameCol(1, true)
  }

  _focusOnFirstItem = () => {
    const { matchedTabs } = this.store.searchStore
    if (matchedTabs.length) {
      return this._setFocusedItem(matchedTabs[0])
    }
    const { windows } = this.store.windowStore
    if (windows.length) {
      this._setFocusedItem(windows[0])
    }
  }

  setDefaultFocusedTab = () => {
    log.debug('setDefaultFocusedTab:', { focusedItem: this.focusedItem })
    if (this.focusedItem) {
      return
    }
    const { lastFocusedWindow } = this.store.windowStore
    if (!lastFocusedWindow) {
      log.debug('setDefaultFocusedTab no lastFocusedWindow:', {
        lastFocusedWindow
      })
      return
    }
    if (lastFocusedWindow.hide) {
      return this.focus(lastFocusedWindow)
    }
    const tab = lastFocusedWindow.tabs.find((x) => x.active && x.isMatched)
    log.debug('setDefaultFocusedTab active tab:', { tab })
    if (tab) {
      this.focus(tab)
    }
  }

  toggleHideForFocusedWindow = () => {
    if (this.focusedItem) {
      this.focusedItem.toggleHide()
    }
  }
}
