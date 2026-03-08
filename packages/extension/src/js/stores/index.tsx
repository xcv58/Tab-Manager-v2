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
    const { down, focusedItem } = this.focusStore
    let tabsToRemove: Tab[] = []
    if (this.tabStore.selection.size > 0) {
      tabsToRemove = this.tabStore.sources
    } else {
      tabsToRemove = this._getFocusedOrSelectedTab()
    }
    while (this._isFocusedItemAffectedByTabs(tabsToRemove)) {
      down()
      if (focusedItem === this.focusStore.focusedItem) {
        this.focusStore.defocus()
        break
      }
    }
    this.tabStore.unselectAll()
    tabsToRemove.forEach((x) => x.remove())
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

  _isFocusedItemAffectedByTabs = (tabs: Tab[]) => {
    const { focusedItem } = this.focusStore
    if (!focusedItem || !tabs.length) {
      return false
    }
    const tabIds = new Set(tabs.map((tab) => tab.id))
    if (focusedItem instanceof Tab) {
      return tabIds.has(focusedItem.id)
    }
    if (focusedItem instanceof TabGroupRow) {
      const groupTabIds = new Set(
        this.tabGroupStore
          ?.getTabsForGroup?.(focusedItem.groupId)
          ?.map((tab) => tab.id) || [],
      )
      return (
        groupTabIds.size > 0 &&
        Array.from(groupTabIds).every((tabId) => tabIds.has(tabId))
      )
    }
    return false
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
