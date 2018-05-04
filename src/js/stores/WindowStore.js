import { action, computed, observable } from 'mobx'
import {
  moveTabs,
  getLastFocusedWindowId,
  notSelfPopup,
  windowComparator,
  isSelfPopup
} from 'libs'
import actions from 'libs/actions'
import Window from './Window'
import Tab from './Tab'

const DEBOUNCE_INTERVAL = 1000

export default class WindowsStore {
  constructor (store) {
    this.store = store
  }

  didMount = () => {
    this.getAllWindows()
    // chrome.windows.onCreated.addListener(this.updateAllWindows)
    chrome.windows.onFocusChanged.addListener(this.onFocusChanged)
    // chrome.windows.onRemoved.addListener(this.updateAllWindows)

    chrome.tabs.onCreated.addListener(this.onCreated)
    chrome.tabs.onUpdated.addListener(this.onUpdated)
    chrome.tabs.onActivated.addListener(this.onActivated)
    chrome.tabs.onRemoved.addListener(this.onRemoved)

    // Move tabs related functions, use `updateAllWindows` to keep clean.
    chrome.tabs.onMoved.addListener(this.updateAllWindows)
    chrome.tabs.onAttached.addListener(this.updateAllWindows)
    chrome.tabs.onDetached.addListener(this.updateAllWindows)
    chrome.tabs.onReplaced.addListener(this.updateAllWindows)
  }

  @observable windows = []
  @observable initialLoading = true
  @observable lastFocusedWindowId = null

  lastCallTime = 0
  updateHandler = null
  batching = false

  @computed
  get tabCount () {
    return this.windows
      .map(x => x.tabs.length)
      .reduce((acc, cur) => acc + cur, 0)
  }

  @computed
  get tabs () {
    return [].concat(...this.windows.map(x => x.tabs.slice()))
  }

  clearWindow = () => {
    for (let index = 0; index < this.windows.length;) {
      if (this.windows[index].tabs.length === 0) {
        this.windows.splice(index, 1)
      } else {
        index++
      }
    }
  }

  onRemoved = (id, { windowId, isWindowClosing }) => {
    this.removeTabs([id])
    this.store.tabStore.selection.delete(id)
  }

  @action
  onUpdated = (tabId, changeInfo, newTab) => {
    const tab = this.tabs.find(x => x.id === tabId)
    if (tab) {
      Object.assign(tab, newTab)
      tab.setUrlIcon()
    }
  }

  onFocusChanged = windowId => {
    if (windowId <= 0) {
      return
    }
    chrome.windows.get(windowId, { populate: true }, win => {
      if (win && !isSelfPopup(win)) {
        this.lastFocusedWindowId = windowId
      }
    })
  }

  @action
  onCreated = tab => {
    const { index, windowId } = tab
    const win = this.windows.find(x => x.id === windowId)
    if (!win) {
      this.windows.push(new Window({ id: windowId, tabs: [tab] }, this.store))
    } else {
      win.add(new Tab(tab, this.store, win), index)
    }
  }

  @action
  onActivated = ({ tabId, windowId }) => {
    this.lastFocusedWindowId = windowId
    const win = this.windows.find(x => x.id === windowId)
    if (!win) {
      return
    }
    win.tabs.forEach(tab => {
      if (tab.active && tab.id !== tabId) {
        tab.active = false
      }
    })
    const tab = win.tabs.find(x => x.id === tabId)
    if (tab) {
      tab.active = true
    }
  }

  suspend = () => {
    this.batching = true
  }

  resume = () => {
    if (this.updateHandler != null) {
      clearTimeout(this.updateHandler)
    }
    this.batching = false
    this.getAllWindows()
  }

  @action
  removeTabs = ids => {
    const set = new Set(ids)
    this.windows.forEach(win => win.removeTabs(set))
    this.clearWindow()
  }

  @action
  createNewWindow = tabs => {
    this.suspend()
    this.removeTabs(tabs.map(x => x.id))
    const win = new Window({ tabs: [] }, this.store)
    win.tabs = tabs
    this.windows.push(win)
    this.clearWindow()
    chrome.runtime.sendMessage(
      {
        tabs: tabs.map(({ id, pinned }) => ({ id, pinned })),
        action: actions.createWindow
      },
      this.resume
    )
  }

  @action
  updateAllWindows = () => {
    const time = Date.now()
    if (this.updateHandler != null) {
      clearTimeout(this.updateHandler)
    }
    if (time - this.lastCallTime < DEBOUNCE_INTERVAL) {
      this.updateHandler = setTimeout(this.getAllWindows, DEBOUNCE_INTERVAL)
    } else {
      this.getAllWindows()
    }
    this.lastCallTime = time
  }

  @action
  selectAll = () => {
    this.store.tabStore.selectAll(this.tabs)
  }

  @action
  windowMounted = () => {
    const win = this.windows.find(x => !x.showTabs)
    if (win) {
      win.showTabs = true
      win.tabMounted()
    }
  }

  @computed
  get lastFocusedWindow () {
    return this.windows.find(x => x.lastFocused)
  }

  @computed
  get urlCountMap () {
    return this.tabs.reduce((acc, tab) => {
      const { url } = tab
      acc[url] = (acc[url] || 0) + 1
      return acc
    }, {})
  }

  focusLastActiveTab = () => {
    if (!this.lastFocusedWindow) {
      return
    }
    if (this.store.searchStore.focusedWinIndex !== -1) {
      return
    }
    this.store.searchStore.firstTab()
  }

  getTargetWindow = windowId => {
    const win = this.windows.find(win => win.id === windowId)
    if (!win) {
      throw new Error(
        `getTargetWindow canot find window for windowId: ${windowId}!`
      )
    }
    return win
  }

  @action
  moveTabs = async (tabs, windowId, from = 0) => {
    const targetWindow = this.getTargetWindow(windowId)
    tabs.map((tab, i) => {
      const index = from + (from !== -1 ? i : 0)
      const sourceWindow = this.getTargetWindow(tab.windowId)
      sourceWindow.remove(tab)
      targetWindow.add(tab, index)
    })
    this.clearWindow()
    await moveTabs(tabs, windowId, from)
  }

  getAllWindows = () => {
    if (this.batching) {
      return
    }
    chrome.windows.getAll({ populate: true }, async (windows = []) => {
      this.lastFocusedWindowId = await getLastFocusedWindowId()

      this.windows = windows
        .filter(notSelfPopup)
        .map(win => new Window(win, this.store))
        .sort(windowComparator)

      // this.focusLastActiveTab()

      if (this.initialLoading) {
        this.windowMounted()
      }
      this.initialLoading = false
      this.updateHandler = null
    })
  }
}
