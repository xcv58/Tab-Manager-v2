import { makeAutoObservable } from 'mobx'
import Store from 'stores'
import log from 'libs/log'
import Tab from './Tab'
import Window from './Window'
import Focusable from './Focusable'
import { MutableRefObject } from 'react'

const getNextItem = (
  items: any[],
  index: number,
  direction: number,
  side = false,
) => {
  let nextIndex = index + direction + items.length
  if (side) {
    nextIndex = direction * (items.length - 1)
  }
  return items[nextIndex % items.length]
}

const getFocusableItems = (win: Window, focusedItem: Focusable) => {
  if (win.hide || win === focusedItem) {
    return [win, ...win.matchedTabs]
  }
  return win.matchedTabs
}

export default class FocusStore {
  store: Store

  constructor(store: Store) {
    makeAutoObservable(this)

    this.store = store
  }

  get focusedItem(): Focusable | null {
    const { windows, tabs } = this.store.windowStore
    if (this.focusedTabId) {
      return tabs.find((x) => x.id === this.focusedTabId && x.isVisible)
    } else if (this.focusedWindowId) {
      return windows.find((x) => x.id === this.focusedWindowId)
    }
  }

  focusedWindowId: number = null

  focusedTabId: number = null

  containerRef: MutableRefObject<HTMLElement> = null

  setContainerRef = (ref: MutableRefObject<HTMLElement>) => {
    this.containerRef = ref
  }

  _top = -1

  _updateTop = (top: number) => {
    this._top = Math.max(top, this._top)
  }

  _setFocusedItem = (item: Focusable) => {
    log.debug('_setFocusedItem:', item)
    if (item instanceof Window) {
      this.focusedTabId = null
      this.focusedWindowId = item.id
    } else if (item instanceof Tab) {
      this.focusedTabId = item.id
      this.focusedWindowId = null
    } else {
      log.error(
        'invalid input item for _setFocusedItem, it is not Window nor Tab:',
        { item },
      )
    }
  }

  defocus = () => {
    this.focusedTabId = null
    this.focusedWindowId = null
    this._top = -1
  }

  enter = () => {
    if (this.focusedItem) {
      this.focusedItem.activate()
    }
  }

  focus = (item: Focusable) => {
    this._setFocusedItem(item)
  }

  // Toggle select of focused tab, or the focused window.tabs
  select = () => {
    if (this.focusedItem) {
      this.focusedItem.select()
    }
  }

  selectTabsInSameContainer =
    process.env.TARGET_BROWSER === 'firefox'
      ? () => {
          if (this.focusedItem instanceof Tab) {
            this.store.tabStore.selectTabsInSameContainer(this.focusedItem)
          }
        }
      : () => {}

  closeWindow = () => {
    if (this.focusedItem) {
      this.focusedItem.closeWindow()
    }
  }

  selectWindow = () => {
    if (this.focusedItem) {
      this.focusedItem.toggleSelectAll()
    }
  }

  groupTab = () => {
    const { focusedItem } = this
    if (!focusedItem) {
      return
    }
    if (focusedItem instanceof Tab) {
      focusedItem.groupTab()
    }
  }

  _getGrid = (focusedItem: Focusable) => {
    const { scrollTop } = this.containerRef.current
    const { windows } = this.store.windowStore
    const grid: Focusable[][] = []
    let columnIndex = -1
    for (const win of windows) {
      const items = getFocusableItems(win, focusedItem)
      for (const item of items) {
        const rect = item.getBoundingClientRect()
        if (!rect) {
          continue
        }
        if (!grid.length) {
          grid.push([item])
        } else {
          const column = grid[grid.length - 1]
          const previousItem = column[column.length - 1]
          if (previousItem.getBoundingClientRect().left === rect.left) {
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
    return { grid, columnIndex, scrollTop, targetColumn: grid[columnIndex] }
  }

  _moveVertically = (direction: number, side = false) => {
    const { focusedItem } = this
    log.debug('_moveVertically:', { direction, side, focusedItem })
    if (!focusedItem) {
      return this._focusOnFirstItem()
    }
    const { scrollTop, targetColumn } = this._getGrid(focusedItem)
    if (!targetColumn) {
      return log.debug('_moveVertically: No targetColumn found')
    }
    const index = targetColumn.findIndex((x) => x === this.focusedItem)
    const item = getNextItem(targetColumn, index, direction, side)
    if (!item) {
      return log.error('_moveHorizontally: no available item found')
    }
    this._top = scrollTop + item.getBoundingClientRect().top
    log.debug('_moveVertically target item:', item)
    this._setFocusedItem(item)
  }

  _moveHorizontally = (direction: number) => {
    const { focusedItem } = this
    log.debug('_moveHorizontally:', { direction, focusedItem })
    if (!focusedItem) {
      return this._focusOnFirstItem()
    }
    const baseRect = focusedItem.getBoundingClientRect()
    log.debug('_moveHorizontally baseRect:', baseRect)
    if (!baseRect) {
      return
    }
    const { grid, columnIndex, scrollTop } = this._getGrid(focusedItem)
    log.debug('_moveHorizontally grid:', { grid, columnIndex, scrollTop })
    if (columnIndex === -1) {
      return log.error('_moveHorizontally: no available grid')
    }
    this._updateTop(scrollTop + baseRect.top)
    const targetColumn = getNextItem(grid, columnIndex, direction)
    if (!targetColumn) {
      return log.error('_moveHorizontally: no target column')
    }
    let min = Number.MAX_VALUE
    let targetItem = null
    for (const item of targetColumn) {
      const delta = Math.abs(
        scrollTop + item.getBoundingClientRect().top - this._top,
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

  left = () => {
    log.debug('left')
    this._moveHorizontally(-1)
  }

  right = () => {
    log.debug('right')
    this._moveHorizontally(1)
  }

  up = () => {
    log.debug('up')
    this._moveVertically(-1)
  }

  down = () => {
    log.debug('down')
    this._moveVertically(1)
  }

  firstTab = () => {
    log.debug('firstTab')
    this._moveVertically(0, true)
  }

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
      return log.debug('setDefaultFocusedTab no lastFocusedWindow:', {
        lastFocusedWindow,
      })
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
