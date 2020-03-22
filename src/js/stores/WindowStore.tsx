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
import Window from 'stores/Window'
import Tab from 'stores/Tab'
import Column from 'stores/Column'
import Store from 'stores'

const DEBOUNCE_INTERVAL = 1000

export default class WindowsStore {
  store: Store

  constructor (store) {
    this.store = store
  }

  didMount = () => {
    this.getAllWindows()
    // browser.windows.onCreated.addListener(this.updateAllWindows)
    browser.windows.onFocusChanged.addListener(this.onFocusChanged)
    // browser.windows.onRemoved.addListener(this.updateAllWindows)

    browser.tabs.onCreated.addListener(this.onCreated)
    browser.tabs.onUpdated.addListener(this.onUpdated)
    browser.tabs.onActivated.addListener(this.onActivated)
    browser.tabs.onRemoved.addListener(this.onRemoved)
    browser.tabs.onMoved.addListener(this.onMoved)
    browser.tabs.onDetached.addListener(this.onDetached)
    browser.tabs.onAttached.addListener(this.onAttached)

    // Move tabs related functions, use `updateAllWindows` to keep clean.

    // This event may not be relevant for or supported by browsers other than Chrome.
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onReplaced
    browser.tabs.onReplaced.addListener(this.updateAllWindows)
  }

  @observable
  windows = []

  @observable
  columns = []

  @observable
  initialLoading = true

  @observable
  lastFocusedWindowId = null

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
  onAttached = async (tabId, attachInfo) => {
    const { newWindowId } = attachInfo
    const win = this.windows.find((x) => x.id === newWindowId)
    if (!win) {
      const win = await browser.windows.get(newWindowId, {
        populate: true
      })
      this.windows.push(new Window(win, this.store))
    } else {
      win.onAttched(tabId, attachInfo)
    }
  }

  @action
  onDetached = (tabId, detachInfo) => {
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
    this.store.tabStore.selection.delete(id)
    if (!isWindowClosing) {
      this.removeTabs([id])
    } else {
      const index = this.windows.findIndex((x) => x.id === windowId)
      if (index === -1) {
        return
      }
      this.windows.splice(index, 1)
    }
    this.clearWindow()
  }

  @action
  onUpdated = (tabId, changeInfo, newTab) => {
    const tab = this.tabs.find((x) => x.id === tabId)
    if (tab) {
      Object.assign(tab, newTab)
      tab.setUrlIcon()
    }
  }

  onFocusChanged = async (windowId) => {
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
  createNewWindow = async (tabs) => {
    this.suspend()
    this.removeTabs(tabs.map((x) => x.id))
    const win = new Window(
      {
        tabs: []
      },
      this.store
    )
    win.tabs = tabs
    this.windows.push(win)
    this.clearWindow()

    await browser.runtime.sendMessage({
      tabs: tabs.map(({ id, pinned }) => ({
        id,
        pinned
      })),
      action: actions.createWindow
    })
    this.resume()
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
    const windows = await browser.windows.getAll({
      populate: true
    })
    this.lastFocusedWindowId = await getLastFocusedWindowId()

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
  }

  getAllWindows = () => {
    if (this.batching) {
      return
    }
    return this.loadAllWindows()
  }
}
