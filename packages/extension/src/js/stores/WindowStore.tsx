import { makeAutoObservable } from 'mobx'
import {
  browser,
  moveTabs,
  getLastFocusedWindowId,
  notSelfPopup,
  windowComparator,
  isSelfPopup,
} from 'libs'
import actions from 'libs/actions'
import log from 'libs/log'
import Window from 'stores/Window'
import Tab from 'stores/Tab'
import Store from 'stores'
import debounce from 'lodash.debounce'

export default class WindowsStore {
  store: Store

  constructor(store: Store) {
    makeAutoObservable(this)

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

  windows: Window[] = []

  initialLoading = true

  lastFocusedWindowId: number | null = null

  height = 600

  batching = false

  get tabCount() {
    return this.windows
      .map((x) => x.tabs.length)
      .reduce((acc, cur) => acc + cur, 0)
  }

  get tabs(): Tab[] {
    return [].concat(
      ...this.windows.filter((x) => !x.hide).map((x) => x.tabs.slice()),
    )
  }

  get visibleColumn() {
    const tabHeight = this.store.userStore.fontSize * 3
    const heights = this.windows
      .filter((x) => x.visibleLength > 0)
      .map((x) => x.visibleLength * tabHeight)
    let count = 0
    let preHeight = -1
    for (const h of heights) {
      const sum = preHeight + h
      if (sum > this.height || preHeight === -1) {
        preHeight = h
        count += 1
      } else {
        preHeight = sum
      }
    }
    return Math.max(count, 1)
  }

  clearWindow = () => {
    log.debug('clearWindow')
    for (let index = 0; index < this.windows.length; ) {
      if (this.windows[index].tabs.length === 0) {
        this.windows.splice(index, 1)
      } else {
        index++
      }
    }
  }

  onWindowsCreated = async (win: Window) => {
    log.debug('windows.onCreated:', { win })
    await this.getOrCreateWinById(win.id)
  }

  onAttached = async (tabId: number, attachInfo) => {
    log.debug('tabs.onAttached:', { tabId, attachInfo })
    const { newWindowId } = attachInfo
    const win = await this.getOrCreateWinById(newWindowId)
    win.onAttched(tabId, attachInfo)
  }

  // This method will return the window object if it appears in this.windows.
  // Otherwise, it will create a new Window object and push it to this.windows.
  getOrCreateWinById = async (windowId: number) => {
    let win = this.windows.find((x) => x.id === windowId)
    if (win) {
      return win
    }
    const winData = await browser.windows.get(windowId, {
      populate: true,
    })
    win = this.windows.find((x) => x.id === windowId)
    if (!win) {
      win = new Window(winData, this.store)
      this.windows.push(win)
    }
    return win
  }

  onDetached = (tabId: number, detachInfo) => {
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

  onRemoved = (
    id: number,
    {
      windowId,
      isWindowClosing,
    }: { windowId: number; isWindowClosing: boolean },
  ) => {
    log.debug('tabs.onRemoved:', { id, windowId, isWindowClosing })
    this.store.tabStore.selection.delete(id)
    if (!isWindowClosing) {
      this.removeTabs([id])
      this.store.hiddenWindowStore.showWindow(windowId)
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

  onUpdated = (tabId: number, changeInfo, newTab: Tab) => {
    log.debug('tabs.onUpdated:', { tabId, changeInfo, newTab })
    const tab = this.tabs.find((x) => x.id === tabId)
    if (tab) {
      Object.assign(tab, newTab)
      tab.setUrlIcon()
    }
  }

  onFocusChanged = async (windowId: number) => {
    log.debug('windows.onFocusChanged:', { windowId })
    if (windowId <= 0) {
      return
    }
    const win = await browser.windows.get(windowId, {
      populate: true,
    })
    if (win && !isSelfPopup(win)) {
      this.lastFocusedWindowId = windowId
    }
  }

  onCreated = (tab: Tab) => {
    log.debug('tabs.onCreated:', { tab })
    const { index, windowId } = tab
    const win = this.windows.find((x) => x.id === windowId)
    if (!win) {
      this.windows.push(
        new Window(
          {
            id: windowId,
            tabs: [tab],
          },
          this.store,
        ),
      )
    } else {
      win.add(new Tab(tab, this.store, win), index)
    }
  }

  onActivated = (args: { tabId?: number; windowId?: number }) => {
    const { tabId, windowId } = args
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

  onMoved = (tabId: number, moveInfo) => {
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
    this.batching = false
    this.getAllWindows()
  }

  removeTabs = (ids: number[]) => {
    const set = new Set(ids)
    this.windows.forEach((win) => win.removeTabs(set))
    this.clearWindow()
  }

  createNewWindow = (tabs: Tab[]) => {
    log.debug('createNewWindow:', { tabs })
    browser.runtime.sendMessage({
      tabs: tabs.map(({ id, pinned }) => ({
        id,
        pinned,
      })),
      action: actions.createWindow,
    })
  }

  windowMounted = () => {
    // TODO: Remove this when we add concurrent mode
    this.windows
      .filter((win) => !win.showTabs && win.visibleLength === 0)
      .forEach((win) => {
        win.showTabs = true
      })
    const win = this.windows.find((x) => !x.showTabs)
    if (win) {
      win.showTabs = true
    }
  }

  get lastFocusedWindow() {
    return this.windows.find((x) => x.lastFocused)
  }

  get tabFingerprintMap() {
    return this.tabs.reduce((acc: { [key: string]: number }, tab) => {
      const { fingerPrint } = tab
      acc[fingerPrint] = (acc[fingerPrint] || 0) + 1
      return acc
    }, {})
  }

  get duplicatedTabs() {
    return this.tabs.filter((tab) => tab.isDuplicated)
  }

  closeDuplicatedTab = (tab: Tab) => {
    const { id, url } = tab
    this.tabs
      .filter((x) => x.url === url && x.id !== id)
      .forEach((x) => x.remove())
  }

  cleanDuplicatedTabs = () => {
    const tabMap = this.duplicatedTabs.reduce(
      (acc: { [key: string]: Tab[] }, tab) => {
        const { fingerPrint } = tab
        if (acc[fingerPrint]) {
          acc[fingerPrint].push(tab)
        } else {
          acc[fingerPrint] = [tab]
        }
        return acc
      },
      {},
    )
    Object.values(tabMap).forEach((tabs) => {
      tabs.slice(1).forEach((x) => x.remove())
    })
  }

  getTargetWindow = (windowId: number) => {
    const win = this.windows.find((win) => win.id === windowId)
    if (!win) {
      throw new Error(
        `getTargetWindow canot find window for windowId: ${windowId}!`,
      )
    }
    return win
  }

  moveTabs = async (tabs: Tab[], windowId: number, from = 0) => {
    log.debug('moveTabs:', { tabs, windowId, from })
    await moveTabs(tabs, windowId, from)
  }

  updateHeight(height: number) {
    log.debug('WindowsStore.updateHeight:', {
      height,
      'this.height': this.height,
    })
    if (this.height !== height) {
      log.debug(
        'WindowsStore.updateHeight set height from',
        this.height,
        'to',
        height,
      )
      this.height = height
    }
  }

  syncAllWindows = () => {
    this.initialLoading = true
    this.loadAllWindows()
  }

  loadAllWindows = async () => {
    log.debug('loadAllWindows')
    const windows = await browser.windows.getAll({
      populate: true,
    })
    this.lastFocusedWindowId = await getLastFocusedWindowId()
    log.debug('lastFocusedWindowId:', this.lastFocusedWindowId)

    this.windows = windows
      .filter(notSelfPopup)
      .filter(
        (win: any) => this.store.userStore.showAppWindow || win.type !== 'app',
      )
      .map((win: any) => new Window(win, this.store))
      .sort(windowComparator)

    if (this.initialLoading) {
      this.windowMounted()
    }
    this.initialLoading = false
    this.store.focusStore.setDefaultFocusedTab()
  }

  getAllWindows = () => {
    log.debug('getAllWindows:', { batching: this.batching })
    if (this.batching) {
      return
    }
    return this.loadAllWindows()
  }

  updateAllWindows = debounce(this.getAllWindows, 1000, {
    leading: true,
    trailing: true,
  })
}
