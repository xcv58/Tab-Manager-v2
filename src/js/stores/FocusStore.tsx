import { action, computed, observable } from 'mobx'
import Store from 'stores'
import log from 'libs/log'
import Tab from './Tab'
import Window from './Window'

type FocusedItem = Tab | Window

const getNextItem = (items, index, direction, side = false) => {
  let nextIndex = index + direction + items.length
  if (side) {
    nextIndex = direction * (items.length - 1)
  }
  return items[nextIndex % items.length]
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

  @observable
  containerRef = null

  @action
  setContainerRef = (ref) => {
    this.containerRef = ref
  }

  _top: number = 0

  _updateTop = (top) => {
    this._top = Math.max(top, this._top)
  }

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
    this._top = 0
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

  _getGrid = (focusedItem: FocusedItem) => {
    const { scrollTop } = this.containerRef.current
    const { windows } = this.store.windowStore
    const grid: FocusedItem[][] = []
    let columnIndex = 0
    for (const win of windows) {
      for (const item of win.hide ? [win] : win.matchedTabs) {
        if (!grid.length) {
          grid.push([item])
        } else {
          const column = grid[grid.length - 1]
          const previousItem = column[column.length - 1]
          if (
            previousItem.getBoundingClientRect().left ===
            item.getBoundingClientRect().left
          ) {
            column.push(item)
          } else {
            grid.push([item])
          }
        }
        if (item === focusedItem) {
          columnIndex = grid.length - 1
        }
      }
    }
    return {
      grid,
      columnIndex,
      scrollTop
    }
  }

  _moveVertically = (direction, side = false) => {
    const { focusedItem } = this
    log.debug('_moveVertically:', { direction, side, focusedItem })
    if (!focusedItem) {
      return this._focusOnFirstItem()
    }
    const { grid, columnIndex, scrollTop } = this._getGrid(focusedItem)
    const targetColumn = grid[columnIndex]
    const index = targetColumn.findIndex((x) => x === this.focusedItem)
    const item = getNextItem(targetColumn, index, direction, side)
    this._top = scrollTop + item.getBoundingClientRect().top
    this._setFocusedItem(item)
  }

  _moveHorizontally = (direction) => {
    const { focusedItem } = this
    log.debug('_moveHorizontally:', { direction, focusedItem })
    if (!focusedItem) {
      return this._focusOnFirstItem()
    }
    const baseRect = focusedItem.getBoundingClientRect()
    log.debug('_moveHorizontally:', { focusedItem, baseRect })
    if (!baseRect) {
      return
    }
    const { grid, columnIndex, scrollTop } = this._getGrid(focusedItem)
    this._updateTop(scrollTop + baseRect.top)
    const targetColumn = getNextItem(grid, columnIndex, direction)
    let min = Number.MAX_VALUE
    let targetItem = null
    for (const item of targetColumn) {
      const delta = Math.abs(
        scrollTop + item.getBoundingClientRect().top - this._top
      )
      if (delta < min) {
        targetItem = item
        min = delta
      }
    }
    if (targetItem) {
      this._setFocusedItem(targetItem)
    }
  }

  @action
  left = () => {
    log.debug('left')
    this._moveHorizontally(-1)
  }

  @action
  right = () => {
    log.debug('right')
    this._moveHorizontally(1)
  }

  @action
  up = () => {
    log.debug('up')
    this._moveVertically(-1)
  }

  @action
  down = () => {
    log.debug('down')
    this._moveVertically(1)
  }

  @action
  firstTab = () => {
    log.debug('firstTab')
    this._moveVertically(0, true)
  }

  @action
  lastTab = () => {
    log.debug('lastTab')
    this._moveVertically(1, true)
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
