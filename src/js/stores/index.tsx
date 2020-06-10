import { action, computed } from 'mobx'
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

import Tab from './Tab'
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

  containerStore

  constructor () {
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
    if (process.env.TARGET_BROWSER === 'firefox') {
      const ContainerStore = require('./ContainerStore').default
      this.containerStore = new ContainerStore(this)
    }
  }

  @action
  remove = () => {
    const { down, focusedTabId } = this.focusStore
    const { tabs } = this.windowStore
    let tabsToRemove = []
    if (this.tabStore.selection.size > 0) {
      while (this.tabStore.selection.has(this.focusStore.focusedTabId)) {
        down()
        if (focusedTabId === this.focusStore.focusedTabId) {
          this.focusStore.defocus()
          break
        }
      }
      tabsToRemove = tabs.filter((x) => x.isSelected)
    } else {
      if (focusedTabId) {
        tabsToRemove = tabs.filter((x) => x.isFocused)
        down()
      }
    }
    this.tabStore.unselectAll()
    tabsToRemove.forEach((x) => x.remove())
  }

  @action
  reload = () => {
    const { focusedItem } = this.focusStore
    const { tabs } = this.windowStore
    const { selection, unselectAll } = this.tabStore
    let tabsToReload = []
    if (selection.size > 0) {
      tabsToReload = tabs.filter((x) => x.isSelected)
    } else {
      if (focusedItem) {
        tabsToReload = tabs.filter((x) => x.isFocused)
      }
    }
    unselectAll()
    tabsToReload.forEach((x) => x.reload())
  }

  @action
  togglePin = async () => {
    const { focusedItem } = this.focusStore
    const { selection, unselectAll } = this.tabStore
    if (selection.size === 0 && focusedItem) {
      log.debug('togglePin for focusedItem:', { focusedItem })
      if (focusedItem instanceof Tab) {
        await togglePinTabs([focusedItem])
      }
      if (focusedItem instanceof Window) {
        await togglePinTabs(focusedItem.tabs)
      }
    } else {
      await togglePinTabs([...selection.values()])
      unselectAll()
    }
  }

  @computed
  get hasFocusedOrSelectedTab () {
    return this.tabStore.selection.size > 0 || !!this.focusStore.focusedItem
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
    if (focusedItem instanceof Window) {
      return focusedItem.tabs
    }
  }

  @action
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
