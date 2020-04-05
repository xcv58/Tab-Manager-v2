import { action, computed, observable } from 'mobx'
import Store from 'stores'
import log from 'libs/log'
import Tab from './Tab'
import Window from './Window'

type FocusedItem = Tab | Window

export default class FocusStore {
  store: Store

  constructor (store) {
    this.store = store
  }

  @computed
  get focusedItem () {
    const { windows, tabs } = this.store.windowStore
    if (this.focusedTabId) {
      return tabs.find((x) => x.id === this.focusedTabId)
    }
    if (this.focusedWindowId) {
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
    this.focusedItem.activate()
  }

  @action
  focus = (item: FocusedItem) => {
    this._setFocusedItem(item)
  }

  // Toggle select of focused tab, or the focused window.tabs
  @action
  select = () => {
    const { focusedItem } = this
    if (!focusedItem) {
      return
    }
    const { select } = this.store.tabStore
    if (focusedItem instanceof Tab) {
      select(focusedItem)
    }
    if (focusedItem instanceof Window) {
      focusedItem.toggleSelectAll()
    }
  }

  // DONE
  @action
  closeWindow = () => {
    const { focusedItem } = this
    if (!focusedItem) {
      return
    }
    if (focusedItem instanceof Window) {
      focusedItem.close()
    }
    if (focusedItem instanceof Tab) {
      focusedItem.win.close()
    }
  }

  @action
  selectWindow = () => {
    const { focusedItem } = this
    log.debug('selectWindow:', { focusedItem })
    if (!focusedItem) {
      return
    }
    if (focusedItem instanceof Tab) {
      focusedItem.win.toggleSelectAll()
    }
    if (focusedItem instanceof Window) {
      focusedItem.toggleSelectAll()
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

  _findColumn = () => {
    log.debug('_findColumn:', this.focusedItem)
    const { focusedItem } = this
    if (!focusedItem) {
      return
    }
    const baseRect = focusedItem.getBoundingClientRect()
    log.debug('baseRect:', { baseRect })
    if (!baseRect) {
      log.error(
        'The getBoundingClientRect returns invalid response:',
        focusedItem,
        { baseRect }
      )
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
    log.debug('_findRow:', this.focusedItem)
    const { focusedItem } = this
    if (!focusedItem) {
      return
    }
    const baseRect = focusedItem.getBoundingClientRect()
    log.debug('baseRect:', { baseRect })
    if (!baseRect) {
      log.error(
        'The getBoundingClientRect returns invalid response:',
        focusedItem,
        { baseRect }
      )
      return
    }
    const { windows } = this.store.windowStore
    const row: FocusedItem[] = []
    for (const win of windows) {
      for (const item of win.hide ? [win] : win.matchedTabs) {
        const rect = item.getBoundingClientRect()
        if (!rect) {
          continue
        }
        log.debug('item:', item, rect)
        // 1. No previous item -> just add
        // 2. Has previous item with the same left ->
        //      check the delta by Math.abs() and replace it by the smaller one
        // 3. Has previous item with different left -> just add
        if (!row.length) {
          row.push(item)
        } else {
          const lastIndex = row.length - 1
          const preItem = row[lastIndex]
          const preRect = preItem.getBoundingClientRect()
          if (preRect.left === rect.left) {
            const preDelta = Math.abs(baseRect.top - preRect.top)
            const curDelta = Math.abs(baseRect.top - rect.top)
            if (curDelta < preDelta) {
              row[lastIndex] = item
            }
          } else {
            row.push(item)
          }
        }
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
    const tab = lastFocusedWindow.tabs.find((x) => x.active)
    log.debug('setDefaultFocusedTab active tab:', { tab })
    if (tab) {
      this.focus(tab)
    }
  }

  toggleHideForFocusedWindow = () => {
    const { focusedItem } = this
    if (!focusedItem) {
      return
    }
    if (focusedItem instanceof Tab) {
      focusedItem.win.toggleHide()
    }
    if (focusedItem instanceof Window) {
      focusedItem.toggleHide()
    }
  }
}
