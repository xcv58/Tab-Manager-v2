import { action, computed, observable } from 'mobx'
import {
  browser,
  moveTabs,
  getLastFocusedWindowId,
  notSelfPopup,
  windowComparator,
  isSelfPopup,
  TAB_HEIGHT
} from 'libs'
import actions from 'libs/actions'
import log from 'libs/log'
import Window from 'stores/Window'
import Tab from 'stores/Tab'
import Column from 'stores/Column'
import Store from 'stores'

const DEBOUNCE_INTERVAL = 1000

export default class WindowsStore {
  store: Store

  constructor (store) {
    this.store = store
    this.getAllWindows()
  }

  didMount = () => {
    browser.windows.onCreated.addListener(this.onWindowsCreated)
    browser.windows.onFocusChanged.addListener(this.onFocusChanged)
    // browser.windows.onRemoved.addListener(this.updateAllWindows)

    browser.tabs.onActivated.addListener(this.onActivated)
    browser.tabs.onAttached.addListener(this.onAttached)
    browser.tabs.onCreated.addListener(this.onCreated)
    browser.tabs.onDetached.addListener(this.onDetached)
    browser.tabs.onMoved.addListener(this.onMoved)
    browser.tabs.onRemoved.addListener(this.onRemoved)
    browser.tabs.onUpdated.addListener(this.onUpdated)

    // Move tabs related functions, use `updateAllWindows` to keep clean.

    // This event may not be relevant for or supported by browsers other than Chrome.
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onReplaced
    browser.tabs.onReplaced.addListener(this.updateAllWindows)
  }

  @observable
  windows: Window[] = []

  @observable
  columns: Column[] = []

  @observable
  initialLoading = true

  @observable
  lastFocusedWindowId: number | null = null

  height = 600

  lastCallTime = 0

  updateHandler = null

  batching = false

  @computed
  get tabCount () {
    return this.windows
      .map((x) => x.tabs.length)
      .reduce((acc, cur) => acc + cur, 0)
  }

  @computed
  get tabs () {
    return [].concat(...this.windows.map((x) => x.tabs.slice()))
  }

  clearWindow = () => {
    log.debug('clearWindow')
    this.columns.forEach((x) => x.clearWindow())
    for (let index = 0; index < this.columns.length;) {
      if (this.columns[index].length === 0) {
        this.columns.splice(index, 1)
      } else {
        index++
      }
    }
    for (let index = 0; index < this.windows.length;) {
      if (this.windows[index].tabs.length === 0) {
        this.windows.splice(index, 1)
      } else {
        index++
      }
    }
  }

  @action
  onWindowsCreated = async (win) => {
    log.debug('windows.onCreated:', { win })
    await this.getOrCreateWinById(win.id)
    this.updateColumns()
  }

  @action
  onAttached = async (tabId, attachInfo) => {
    log.debug('tabs.onAttached:', { tabId, attachInfo })
    const { newWindowId } = attachInfo
    const win = await this.getOrCreateWinById(newWindowId)
    win.onAttched(tabId, attachInfo)
  }

  // This method will return the window object if it appears in this.windows.
  // Otherwise, it will create a new Window object and push it to this.windows.
  getOrCreateWinById = async (windowId) => {
    let win = this.windows.find((x) => x.id === windowId)
    if (win) {
      return win
    }
    const winData = await browser.windows.get(windowId, {
      populate: true
    })
    win = this.windows.find((x) => x.id === windowId)
    if (!win) {
      win = new Window(winData, this.store)
      this.windows.push(win)
    }
    return win
  }

  @action
  onDetached = (tabId, detachInfo) => {
    log.debug('tabs.onDetached:', { tabId, detachInfo })
    const win = this.windows.find((x) => x.id === detachInfo.oldWindowId)
    if (!win) {
      return this.updateAllWindows()
    }
    if (win.onDetached) {
      win.onDetached(tabId, detachInfo)
    }
    this.clearWindow()
  }

  @action
  onRemoved = (id, { windowId, isWindowClosing }) => {
    log.debug('tabs.onRemoved:', { id, windowId, isWindowClosing })
    this.store.tabStore.selection.delete(id)
    if (!isWindowClosing) {
      this.removeTabs([id])
    } else {
      const index = this.windows.findIndex((x) => x.id === windowId)
      if (index === -1) {
        return
      }
      this.windows[index].tabs = []
      this.windows.splice(index, 1)
    }
    this.clearWindow()
  }

  @action
  onUpdated = (tabId, changeInfo, newTab) => {
    log.debug('tabs.onUpdated:', { tabId, changeInfo, newTab })
    const tab = this.tabs.find((x) => x.id === tabId)
    if (tab) {
      Object.assign(tab, newTab)
      tab.setUrlIcon()
    }
  }

  onFocusChanged = async (windowId) => {
    log.debug('windows.onFocusChanged:', { windowId })
    if (windowId <= 0) {
      return
    }
    const win = await browser.windows.get(windowId, {
      populate: true
    })
    if (win && !isSelfPopup(win)) {
      this.lastFocusedWindowId = windowId
    }
  }

  @action
  onCreated = (tab) => {
    log.debug('tabs.onCreated:', { tab })
    const { index, windowId } = tab
    const win = this.windows.find((x) => x.id === windowId)
    if (!win) {
      this.windows.push(
        new Window(
          {
            id: windowId,
            tabs: [tab]
          },
          this.store
        )
      )
    } else {
      win.add(new Tab(tab, this.store, win), index)
    }
    this.updateColumns()
  }

  @action
  onActivated = ({ tabId, windowId }) => {
    log.debug('tabs.onActivate:', { tabId, windowId })
    this.lastFocusedWindowId = windowId
    const win = this.windows.find((x) => x.id === windowId)
    if (!win) {
      return
    }
    win.tabs.forEach((tab) => {
      if (tab.active && tab.id !== tabId) {
        tab.active = false
      }
    })
    const tab = win.tabs.find((x) => x.id === tabId)
    if (tab) {
      tab.active = true
    }
  }

  @action
  onMoved = (tabId, moveInfo) => {
    log.debug('tabs.onMoved:', { tabId, moveInfo })
    const win = this.windows.find((x) => x.id === moveInfo.windowId)
    if (!win) {
      return this.updateAllWindows()
    }
    const moveResult = win.onMoved(tabId, moveInfo)
    if (!moveResult) {
      return this.updateAllWindows()
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
  removeTabs = (ids) => {
    const set = new Set(ids)
    this.windows.forEach((win) => win.removeTabs(set))
    this.clearWindow()
    this.updateColumns()
  }

  @action
  createNewWindow = (tabs) => {
    log.debug('createNewWindow:', { tabs })
    browser.runtime.sendMessage({
      tabs: tabs.map(({ id, pinned }) => ({
        id,
        pinned
      })),
      action: actions.createWindow
    })
  }

  @action
  updateAllWindows = () => {
    const time = Date.now()
    log.debug('updateAllWindows:', { time })
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
  selectAll = () => this.store.tabStore.selectAll(this.tabs)

  @action
  windowMounted = () => {
    // TODO: Remove this when we add concurrent mode
    this.windows
      .filter((win) => !win.showTabs && win.visibleLength === 0)
      .forEach((win) => {
        win.showTabs = true
        win.tabMounted()
      })
    const win = this.windows.find((x) => !x.showTabs)
    if (win) {
      win.showTabs = true
      win.tabMounted()
    }
  }

  @computed
  get lastFocusedWindow () {
    return this.windows.find((x) => x.lastFocused)
  }

  @computed
  get urlCountMap () {
    return this.tabs.reduce((acc, tab) => {
      const { url } = tab
      acc[url] = (acc[url] || 0) + 1
      return acc
    }, {})
  }

  @computed
  get duplicatedTabs () {
    return this.tabs.filter((tab) => this.urlCountMap[tab.url] > 1)
  }

  @action
  closeDuplicatedTab = (tab) => {
    const { id, url } = tab
    this.tabs
      .filter((x) => x.url === url && x.id !== id)
      .forEach((x) => x.remove())
  }

  @action
  cleanDuplicatedTabs = () => {
    const tabMap = this.duplicatedTabs.reduce((acc, tab) => {
      const { url } = tab
      if (acc[url]) {
        acc[url].push(tab)
      } else {
        acc[url] = [tab]
      }
      return acc
    }, {})
    Object.values(tabMap).map((tabs) => {
      tabs.slice(1).forEach((x) => x.remove())
    })
  }

  getTargetWindow = (windowId) => {
    const win = this.windows.find((win) => win.id === windowId)
    if (!win) {
      throw new Error(
        `getTargetWindow canot find window for windowId: ${windowId}!`
      )
    }
    return win
  }

  @action
  moveTabs = async (tabs, windowId, from = 0) => {
    log.debug('moveTabs:', { tabs, windowId, from })
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

  @action
  updateHeight (height) {
    log.debug('WindowsStore.updateHeight:', {
      height,
      'this.height': this.height
    })
    if (this.height !== height && Math.abs(this.height - height) > TAB_HEIGHT) {
      this.height = height
      this.updateColumns()
    }
  }

  @action
  updateColumns () {
    const max = Math.ceil((this.height / TAB_HEIGHT) * 1.0)
    this.columns = this.windows
      .filter((x) => x.visibleLength > 0)
      .reduce(
        (acc, cur) => {
          const column = acc[acc.length - 1]
          if (column.length === 0 || column.length + cur.visibleLength <= max) {
            column.add(cur)
          } else {
            acc.push(new Column(this.store, cur))
          }
          return acc
        },
        [new Column(this.store)]
      )
  }

  syncAllWindows = () => {
    this.initialLoading = true
    this.loadAllWindows()
  }

  loadAllWindows = async () => {
    log.debug('loadAllWindows')
    const windows = await browser.windows.getAll({
      populate: true
    })
    this.lastFocusedWindowId = await getLastFocusedWindowId()
    log.debug('lastFocusedWindowId:', this.lastFocusedWindowId)

    this.windows = windows
      .filter(notSelfPopup)
      .map((win) => new Window(win, this.store))
      .sort(windowComparator)

    if (this.initialLoading) {
      this.windowMounted()
    }
    this.updateColumns()
    this.initialLoading = false
    this.updateHandler = null
    this.store.searchStore.setDefaultFocusedTab()
  }

  getAllWindows = () => {
    log.debug('getAllWindows:', { batching: this.batching })
    if (this.batching) {
      return
    }
    return this.loadAllWindows()
  }
}
