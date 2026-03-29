import { makeAutoObservable } from 'mobx'
import { togglePinTabs, writeToClipboard } from 'libs'
import log from 'libs/log'
import WindowStore from 'stores/WindowStore'
import SearchStore from 'stores/SearchStore'
import TabStore from 'stores/TabStore'
import ArrangeStore from 'stores/ArrangeStore'
import DragStore from 'stores/DragStore'
import ShortcutStore from 'stores/ShortcutStore'
import UserStore from 'stores/UserStore'
import HoverStore from 'stores/HoverStore'
import HiddenWindowStore from 'stores/HiddenWindowStore'
import FocusStore from 'stores/FocusStore'
import TabGroupStore from './TabGroupStore'
import ContainerStore from './ContainerStore'

import Tab from './Tab'
import TabGroupRow from './TabGroupRow'
import Window from './Window'
import Focusable from './Focusable'

export default class Store {
  windowStore: WindowStore

  tabStore: TabStore

  arrangeStore: ArrangeStore

  dragStore: DragStore

  shortcutStore: ShortcutStore

  userStore: UserStore

  hoverStore: HoverStore

  searchStore: SearchStore

  hiddenWindowStore: HiddenWindowStore

  focusStore: FocusStore

  tabGroupStore

  containerStore

  constructor() {
    makeAutoObservable(this)

    this.windowStore = new WindowStore(this)
    this.tabStore = new TabStore(this)
    this.arrangeStore = new ArrangeStore(this)
    this.dragStore = new DragStore(this)
    this.shortcutStore = new ShortcutStore(this)
    this.userStore = new UserStore(this)
    this.hoverStore = new HoverStore(this)
    this.searchStore = new SearchStore(this)
    this.hiddenWindowStore = new HiddenWindowStore(this)
    this.focusStore = new FocusStore(this)
    if (
      process.env.TARGET_BROWSER === 'firefox' ||
      process.env.TARGET_BROWSER === 'chrome'
    ) {
      this.tabGroupStore = new TabGroupStore(this)
    }
    if (process.env.TARGET_BROWSER === 'firefox') {
      this.containerStore = new ContainerStore(this)
    }
  }

  remove = () => {
    let tabsToRemove: Tab[] = []
    if (this.tabStore.selection.size > 0) {
      tabsToRemove = this.tabStore.sources
    } else {
      tabsToRemove = this._getFocusedOrSelectedTab()
    }
    const nextFocusedItem = this.prepareFocusForRemovedTabs(tabsToRemove)
    this.tabStore.unselectAll()
    tabsToRemove.forEach((x) => x.remove({ preserveFocus: false }))
    this.restoreDomFocusAfterRemoval(nextFocusedItem)
  }

  prepareFocusForRemovedTabs = (tabsToRemove: Tab[]) => {
    const initialFocusedItem = this.focusStore.focusedItem
    if (!this._isItemAffectedByTabs(initialFocusedItem, tabsToRemove)) {
      return null
    }

    const columnItems = this.focusStore.getColumnItems(initialFocusedItem)
    const focusedIndex = columnItems.findIndex(
      (item) => item === initialFocusedItem,
    )
    if (focusedIndex === -1) {
      this.focusStore.defocus()
      return null
    }

    const nextFocusedItem =
      columnItems
        .slice(focusedIndex + 1)
        .find((item) => !this._isItemAffectedByTabs(item, tabsToRemove)) ||
      columnItems
        .slice(0, focusedIndex)
        .reverse()
        .find((item) => !this._isItemAffectedByTabs(item, tabsToRemove)) ||
      null

    if (!nextFocusedItem) {
      this.focusStore.defocus()
      return null
    }

    this.focusStore.focus(nextFocusedItem, {
      origin: 'keyboard',
      reveal: true,
      moveDomFocus: false,
    })
    return nextFocusedItem
  }

  restoreDomFocusAfterRemoval = (item: Focusable | null) => {
    if (!item || typeof window === 'undefined') {
      return
    }
    const restoreWhenReady = (attempt = 0) => {
      if (this.focusStore.focusedItem === item) {
        if (!item.nodeRef?.current) {
          if (attempt < 10) {
            window.requestAnimationFrame(() => restoreWhenReady(attempt + 1))
          }
          return
        }
        this.focusStore.focus(item, {
          origin: 'keyboard',
          moveDomFocus: true,
          reveal: true,
        })
      }
    }
    window.requestAnimationFrame(() => restoreWhenReady())
  }

  reload = () => {
    const { selection, unselectAll } = this.tabStore
    let tabsToReload: Tab[] = []
    if (selection.size > 0) {
      tabsToReload = this.tabStore.sources
    } else {
      tabsToReload = this._getFocusedOrSelectedTab()
    }
    unselectAll()
    tabsToReload.forEach((x) => x.reload())
  }

  togglePin = async () => {
    const { focusedItem } = this.focusStore
    const { selection, unselectAll } = this.tabStore
    if (selection.size === 0 && focusedItem) {
      log.debug('togglePin for focusedItem:', { focusedItem })
      const tabs = this._getFocusedOrSelectedTab()
      if (tabs.length) {
        await togglePinTabs(tabs)
      }
    } else {
      await togglePinTabs([...selection.values()])
      unselectAll()
    }
  }

  get hasFocusedOrSelectedTab() {
    return (
      this.tabStore.selection.size > 0 ||
      this._getFocusedOrSelectedTab().length > 0
    )
  }

  _getFocusedOrSelectedTab = () => {
    const { sources } = this.tabStore
    if (sources.length) {
      return sources
    }
    const { focusedItem } = this.focusStore
    if (!focusedItem) {
      return []
    }
    if (focusedItem instanceof Tab) {
      return [focusedItem]
    }
    if (focusedItem instanceof TabGroupRow) {
      return this.tabGroupStore?.getTabsForGroup?.(focusedItem.groupId) || []
    }
    if (focusedItem instanceof Window) {
      return focusedItem.tabs
    }
    return []
  }

  _isItemAffectedByTabs = (item: Focusable | null, tabs: Tab[]) => {
    if (!item || !tabs.length) {
      return false
    }
    const tabIds = new Set(tabs.map((tab) => tab.id))
    if (item instanceof Tab) {
      return tabIds.has(item.id)
    }
    if (item instanceof TabGroupRow) {
      const groupTabIds = new Set(
        this.tabGroupStore
          ?.getTabsForGroup?.(item.groupId)
          ?.map((tab) => tab.id) || [],
      )
      return (
        groupTabIds.size > 0 &&
        Array.from(groupTabIds).every((tabId) => tabIds.has(tabId))
      )
    }
    return false
  }

  _isFocusedItemAffectedByTabs = (tabs: Tab[]) => {
    return this._isItemAffectedByTabs(this.focusStore.focusedItem, tabs)
  }

  copyTabsInfo = async ({ includeTitle = false, delimiter = '\n' } = {}) => {
    const tabs = this._getFocusedOrSelectedTab()
    if (!tabs || !tabs.length) {
      return
    }
    const text = tabs
      .map((x) => {
        if (includeTitle) {
          return `${x.title}\n${x.url}\n`
        }
        return x.url
      })
      .join(delimiter)
    await writeToClipboard(text)
    this.tabStore.unselectAll()
  }
}
