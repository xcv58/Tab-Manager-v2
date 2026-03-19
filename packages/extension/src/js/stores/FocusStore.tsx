import { makeAutoObservable } from 'mobx'
import Store from 'stores'
import log from 'libs/log'
import Tab from './Tab'
import Window from './Window'
import Focusable from './Focusable'
import type { FocusRequestOptions } from './Focusable'
import { MutableRefObject } from 'react'
import TabGroupRow from './TabGroupRow'

function getNextItem<T>(
  items: T[],
  index: number,
  direction: number,
  side = false,
) {
  let nextIndex = index + direction + items.length
  if (side) {
    nextIndex = direction * (items.length - 1)
  }
  return items[nextIndex % items.length]
}

const getFocusableItems = (win: Window, focusedItem: Focusable) => {
  if (win.hide) {
    return [win]
  }
  if (win === focusedItem) {
    return [win, ...win.focusableRows]
  }
  return win.focusableRows
}

export default class FocusStore {
  store: Store

  focusedItemRef: Focusable | null = null

  constructor(store: Store) {
    makeAutoObservable(this, {
      focusedItemRef: false,
    })

    this.store = store
  }

  get focusedItem(): Focusable | null {
    const { windows, tabs } = this.store.windowStore
    if (this.focusedTabId) {
      return tabs.find((x) => x.id === this.focusedTabId && x.isVisible)
    } else if (this.focusedGroupId != null) {
      return (
        windows
          .find((win) => !!win.getVisibleGroupRow(this.focusedGroupId))
          ?.getVisibleGroupRow(this.focusedGroupId) || null
      )
    } else if (this.focusedWindowId) {
      return windows.find((x) => x.id === this.focusedWindowId)
    }
    return null
  }

  focusedWindowId: number = null

  focusedTabId: number = null

  focusedGroupId: number = null

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
    if (this.focusedItemRef && this.focusedItemRef !== item) {
      this.focusedItemRef.setFocusState({ focused: false })
    }
    if (item instanceof Window) {
      this.focusedTabId = null
      this.focusedGroupId = null
      this.focusedWindowId = item.id
    } else if (item instanceof Tab) {
      this.focusedTabId = item.id
      this.focusedGroupId = null
      this.focusedWindowId = null
    } else if (item instanceof TabGroupRow) {
      this.focusedTabId = null
      this.focusedGroupId = item.groupId
      this.focusedWindowId = null
    } else {
      log.error(
        'invalid input item for _setFocusedItem, it is not Window, Tab, or TabGroupRow:',
        { item },
      )
      return
    }
    this.focusedItemRef = item
  }

  defocus = () => {
    this.focusedItemRef?.setFocusState({ focused: false })
    this.focusedItemRef = null
    this.focusedTabId = null
    this.focusedGroupId = null
    this.focusedWindowId = null
    this._top = -1
  }

  enter = () => {
    if (this.focusedItem) {
      this.focusedItem.activate()
    }
  }

  focus = (item: Focusable, options: FocusRequestOptions = {}) => {
    this._setFocusedItem(item)
    item.setFocusState({
      focused: true,
      origin: options.origin,
      reveal: options.reveal,
      moveDomFocus: options.moveDomFocus,
    })
    if (options.reveal) {
      this.revealItem(item)
    }
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

  getNoGroupId = () => this.store.tabGroupStore?.getNoGroupId?.() ?? -1

  canMutateTabGroups = () => !!this.store.tabGroupStore?.canMutateGroups?.()

  toggleFocusedTabGroup = () => {
    if (
      !this.canMutateTabGroups() ||
      !(
        this.focusedItem instanceof Tab ||
        this.focusedItem instanceof TabGroupRow
      )
    ) {
      return
    }
    const { groupId } = this.focusedItem
    if (groupId === this.getNoGroupId() || !this.store.tabGroupStore) {
      return
    }
    this.store.tabGroupStore.toggleCollapsed(groupId)
  }

  ungroupFocusedTab = () => {
    if (
      !this.canMutateTabGroups() ||
      !(
        this.focusedItem instanceof Tab ||
        this.focusedItem instanceof TabGroupRow
      )
    ) {
      return
    }
    const { groupId } = this.focusedItem
    if (groupId === this.getNoGroupId() || !this.store.tabGroupStore) {
      return
    }
    this.store.tabGroupStore.ungroup(groupId)
  }

  ungroupFocusedSingleTab = () => {
    if (
      !this.canMutateTabGroups() ||
      !(this.focusedItem instanceof Tab) ||
      !this.store.tabGroupStore
    ) {
      return
    }
    const { groupId, id } = this.focusedItem
    if (groupId === this.getNoGroupId()) {
      return
    }
    this.store.tabGroupStore.ungroupTab(id)
  }

  createGroupFromFocusedOrSelectedTabs = () => {
    if (!this.canMutateTabGroups() || !this.store.tabGroupStore) {
      return
    }
    const selectedTabs = this.store.tabStore.sources
    const focusedTab = this.focusedItem instanceof Tab ? [this.focusedItem] : []
    const tabs = Array.from(
      new Map(
        (selectedTabs.length ? selectedTabs : focusedTab).map((tab) => [
          tab.id,
          tab,
        ]),
      ).values(),
    )
    if (!this.store.tabGroupStore.canCreateGroupFromTabs(tabs)) {
      return
    }
    this.store.tabGroupStore.createGroup(tabs.map((tab) => tab.id))
    this.store.tabStore.unselectAll()
  }

  _getGrid = (focusedItem: Focusable) => {
    const { windowsByColumn } = this.store.windowStore
    const grid = windowsByColumn.map((column) =>
      column.flatMap((win) => getFocusableItems(win, focusedItem)),
    )
    const columnIndex = grid.findIndex((column) => column.includes(focusedItem))
    return { grid, columnIndex, targetColumn: grid[columnIndex] }
  }

  _moveVertically = (direction: number, side = false) => {
    const { focusedItem } = this
    log.debug('_moveVertically:', { direction, side, focusedItem })
    if (!focusedItem) {
      return this._focusOnFirstItem()
    }
    const { targetColumn } = this._getGrid(focusedItem)
    if (!targetColumn) {
      return log.debug('_moveVertically: No targetColumn found')
    }
    const index = targetColumn.findIndex((x) => x === this.focusedItem)
    const item = getNextItem(targetColumn, index, direction, side)
    if (!item) {
      return log.error('_moveHorizontally: no available item found')
    }
    this._top = this.store.windowStore.getItemLayout(item)?.top ?? this._top
    log.debug('_moveVertically target item:', item)
    this.focus(item, {
      origin: 'keyboard',
      reveal: true,
    })
  }

  _moveHorizontally = (direction: number) => {
    const { focusedItem } = this
    log.debug('_moveHorizontally:', { direction, focusedItem })
    if (!focusedItem) {
      return this._focusOnFirstItem()
    }
    const baseLayout = this.store.windowStore.getItemLayout(focusedItem)
    log.debug('_moveHorizontally baseLayout:', baseLayout)
    if (!baseLayout) {
      return
    }
    const { grid, columnIndex } = this._getGrid(focusedItem)
    log.debug('_moveHorizontally grid:', { grid, columnIndex })
    if (columnIndex === -1) {
      return log.error('_moveHorizontally: no available grid')
    }
    this._updateTop(baseLayout.top)
    const targetColumn = getNextItem(grid, columnIndex, direction)
    if (!targetColumn) {
      return log.error('_moveHorizontally: no target column')
    }
    let min = Number.MAX_VALUE
    let targetItem = null
    for (const item of targetColumn) {
      const itemLayout = this.store.windowStore.getItemLayout(item)
      if (!itemLayout) {
        continue
      }
      const delta = Math.abs(itemLayout.top - this._top)
      if (delta < min) {
        targetItem = item
        min = delta
      }
    }
    if (targetItem) {
      this.focus(targetItem, {
        origin: 'keyboard',
        reveal: true,
      })
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

  revealItem = (item: Focusable) => {
    const container = this.containerRef?.current
    const itemLayout = this.store.windowStore.getItemLayout(item)
    if (!container || !itemLayout) {
      return
    }

    const targetWindow = this.store.windowStore.windows.find(
      (win) => win.id === itemLayout.windowId,
    )
    if (targetWindow && !targetWindow.showTabs) {
      targetWindow.showTabs = true
    }

    let nextScrollTop = container.scrollTop
    let nextScrollLeft = container.scrollLeft

    if (itemLayout.top < container.scrollTop) {
      nextScrollTop = itemLayout.top
    } else if (
      itemLayout.bottom >
      container.scrollTop + container.clientHeight
    ) {
      nextScrollTop = itemLayout.bottom - container.clientHeight
    }

    if (itemLayout.left < container.scrollLeft) {
      nextScrollLeft = itemLayout.left
    } else if (
      itemLayout.right >
      container.scrollLeft + container.clientWidth
    ) {
      nextScrollLeft = itemLayout.right - container.clientWidth
    }

    container.scrollTop = Math.max(nextScrollTop, 0)
    container.scrollLeft = Math.max(nextScrollLeft, 0)
    this.store.windowStore.updateScroll(
      container.scrollTop,
      container.scrollLeft,
    )
  }

  _focusOnFirstItem = () => {
    const { windows } = this.store.windowStore
    for (const win of windows) {
      if (win.hide) {
        return this.focus(win, {
          origin: 'keyboard',
          reveal: true,
        })
      }
      const [firstItem] = win.focusableRows
      if (firstItem) {
        return this.focus(firstItem, {
          origin: 'keyboard',
          reveal: true,
        })
      }
    }
    if (windows.length) {
      return this.focus(windows[0], {
        origin: 'keyboard',
        reveal: true,
      })
    }
  }

  shouldRevealNode = (node: HTMLElement | null) => {
    if (!node) {
      return false
    }
    const container = this.containerRef?.current
    if (!container) {
      return true
    }
    const nodeRect = node.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    return (
      nodeRect.top < containerRect.top ||
      nodeRect.bottom > containerRect.bottom ||
      nodeRect.left < containerRect.left ||
      nodeRect.right > containerRect.right
    )
  }

  setDefaultFocusedTab = () => {
    this.setDefaultFocusedTabWithOptions()
  }

  setDefaultFocusedTabWithOptions = ({
    reveal = false,
    fallbackWhenActiveHidden = true,
  }: {
    reveal?: boolean
    fallbackWhenActiveHidden?: boolean
  } = {}) => {
    log.debug('setDefaultFocusedTab:', {
      focusedItem: this.focusedItem,
      reveal,
      fallbackWhenActiveHidden,
    })
    if (this.focusedItem) {
      return false
    }
    const { lastFocusedWindow } = this.store.windowStore
    if (!lastFocusedWindow) {
      log.debug('setDefaultFocusedTab no lastFocusedWindow:', {
        lastFocusedWindow,
      })
      return false
    }
    if (lastFocusedWindow.hide) {
      this.focus(lastFocusedWindow, { reveal })
      return true
    }
    const activeTab = lastFocusedWindow.tabs.find((x) => x.active)
    log.debug('setDefaultFocusedTab active tab:', { tab: activeTab })
    if (activeTab?.isVisible) {
      this.focus(activeTab, { reveal })
      return true
    }
    if (activeTab && !fallbackWhenActiveHidden) {
      return false
    }
    const [firstVisibleItem] = lastFocusedWindow.focusableRows
    if (firstVisibleItem) {
      this.focus(firstVisibleItem, { reveal })
      return true
    }
    return false
  }

  toggleHideForFocusedWindow = () => {
    if (this.focusedItem) {
      this.focusedItem.toggleHide()
    }
  }
}
