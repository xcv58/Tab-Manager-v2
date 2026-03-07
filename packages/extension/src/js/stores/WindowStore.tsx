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

type LayoutRepackReason =
  | 'manual'
  | 'resize'
  | 'window-change'
  | 'settings-change'
  | 'initial-load'
  | 'sync'
  | 'visibility-hidden'
  | 'visibility-visible'
  | 'window-blur'
  | 'window-focus'

type LayoutDirtyReason =
  | 'group-toggle'
  | 'window-toggle'
  | 'group-browser-event'
  | 'tab-browser-event'
  | 'drag-drop'
  | 'arrange-change'
  | 'window-browser-event'

type LoadRepackPolicy = 'always' | 'if-clean' | 'never'

type LoadAllWindowsOptions = {
  repackPolicy?: LoadRepackPolicy
  reason?: LayoutRepackReason | LayoutDirtyReason
}

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
    this.bindLifecycleLayoutRefresh()
  }

  willUnmount = () => {
    browser.windows.onCreated.removeListener(this.onWindowsCreated)
    browser.windows.onFocusChanged.removeListener(this.onFocusChanged)

    browser.tabs.onActivated.removeListener(this.onActivated)
    browser.tabs.onAttached.removeListener(this.onAttached)
    browser.tabs.onCreated.removeListener(this.onCreated)
    browser.tabs.onDetached.removeListener(this.onDetached)
    browser.tabs.onMoved.removeListener(this.onMoved)
    browser.tabs.onRemoved.removeListener(this.onRemoved)
    browser.tabs.onUpdated.removeListener(this.onUpdated)
    browser.tabs.onReplaced.removeListener(this.updateAllWindows)
    this.unbindLifecycleLayoutRefresh()
  }

  windows: Window[] = []

  initialLoading = true

  lastFocusedWindowId: number | null = null

  height = 600

  batching = false

  layoutDirty = false

  dirtyWindowIds: Set<number> = new Set()

  columnLayout: number[][] = [[]]

  columnCount = 1

  lastViewportHeight =
    typeof window !== 'undefined' ? window.innerHeight || 0 : 0

  lastViewportWidth = typeof window !== 'undefined' ? window.innerWidth || 0 : 0

  lifecycleListenersBound = false

  lifecycleSuppressionMs = 120

  lifecycleLastTriggeredAt: Record<'background' | 'foreground', number> = {
    background: 0,
    foreground: 0,
  }

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

  get visibleWindows() {
    return this.windows.filter((win) => win.visibleLength > 0)
  }

  get rawVisibleColumn() {
    return this.computeColumnLayout(this.visibleWindows).columnCount
  }

  get visibleColumn() {
    return Math.max(this.columnCount, 1)
  }

  get windowsByColumn() {
    const visibleWindows = this.visibleWindows
    if (!visibleWindows.length) {
      return [] as Window[][]
    }

    const map = new Map(visibleWindows.map((win) => [win.id, win]))
    const assigned = new Set<number>()
    const columnCount = Math.max(this.columnCount, 1)
    const columns = Array.from({ length: columnCount }, () => [] as Window[])

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const windowIds = this.columnLayout[columnIndex] || []
      windowIds.forEach((windowId) => {
        const win = map.get(windowId)
        if (!win) {
          return
        }
        assigned.add(windowId)
        columns[columnIndex].push(win)
      })
    }

    visibleWindows.forEach((win) => {
      if (!assigned.has(win.id)) {
        columns[0].push(win)
      }
    })

    return columns
  }

  getRenderedLayoutSnapshot = () => {
    const layout = this.windowsByColumn.map((column) =>
      column.map((win) => win.id),
    )
    if (!layout.length) {
      layout.push([])
    }
    const columnCount = Math.max(layout.length, 1)
    return { layout, columnCount }
  }

  isSameLayout = (left: number[][], right: number[][]) => {
    if (left.length !== right.length) {
      return false
    }
    for (let columnIndex = 0; columnIndex < left.length; columnIndex += 1) {
      const leftColumn = left[columnIndex]
      const rightColumn = right[columnIndex]
      if (leftColumn.length !== rightColumn.length) {
        return false
      }
      for (let rowIndex = 0; rowIndex < leftColumn.length; rowIndex += 1) {
        if (leftColumn[rowIndex] !== rightColumn[rowIndex]) {
          return false
        }
      }
    }
    return true
  }

  hasLayoutDelta = () => {
    const rendered = this.getRenderedLayoutSnapshot()
    const computed = this.computeColumnLayout(this.visibleWindows)
    return (
      rendered.columnCount !== computed.columnCount ||
      !this.isSameLayout(rendered.layout, computed.layout)
    )
  }

  markLayoutDirty = (reason: LayoutDirtyReason, windowId?: number) => {
    log.debug('WindowsStore.markLayoutDirty', {
      reason,
      windowId,
    })
    this.layoutDirty = true
    if (typeof windowId === 'number') {
      this.dirtyWindowIds.add(windowId)
    } else {
      this.dirtyWindowIds.clear()
    }
  }

  markLayoutDirtyIfNeeded = (reason: LayoutDirtyReason, windowId?: number) => {
    if (this.layoutDirty) {
      if (typeof windowId === 'number' && this.dirtyWindowIds.size > 0) {
        this.dirtyWindowIds.add(windowId)
      }
      return true
    }
    if (!this.hasLayoutDelta()) {
      return false
    }
    this.markLayoutDirty(reason, windowId)
    return true
  }

  isWindowLayoutDirty = (windowId?: number) => {
    if (!this.layoutDirty) {
      return false
    }
    if (typeof windowId !== 'number') {
      return true
    }
    if (this.dirtyWindowIds.size === 0) {
      return true
    }
    return this.dirtyWindowIds.has(windowId)
  }

  computeColumnLayout = (windows: Window[]) => {
    if (!windows.length) {
      return {
        layout: [[]],
        columnCount: 1,
      }
    }

    const tabHeight = (this.store.userStore?.fontSize || 14) * 3
    const layout: number[][] = [[]]
    let columnIndex = 0
    let currentHeight = 0

    windows.forEach((win) => {
      const winHeight = win.visibleLength * tabHeight
      const currentColumn = layout[columnIndex]
      if (currentColumn.length > 0 && currentHeight + winHeight > this.height) {
        columnIndex += 1
        layout[columnIndex] = []
        currentHeight = 0
      }
      layout[columnIndex].push(win.id)
      currentHeight += winHeight
    })

    return {
      layout,
      columnCount: Math.max(layout.length, 1),
    }
  }

  flushLayoutIfDirty = (reason: LayoutRepackReason) => {
    if (!this.layoutDirty) {
      return false
    }
    this.repackLayout(reason)
    return true
  }

  repackLayout = (reason: LayoutRepackReason) => {
    const { layout, columnCount } = this.computeColumnLayout(
      this.visibleWindows,
    )
    this.columnLayout = layout
    this.columnCount = columnCount
    this.layoutDirty = false
    this.dirtyWindowIds.clear()
    log.debug('WindowsStore.repackLayout', {
      reason,
      columnCount,
      layout,
    })
  }

  shouldRepackForRemovedWindows = (
    removedWindowIds: number[],
    renderedLayoutBefore: number[][],
  ) => {
    if (!removedWindowIds.length) {
      return false
    }
    const removed = new Set(removedWindowIds)
    return renderedLayoutBefore.some(
      (columnWindowIds) =>
        columnWindowIds.length === 1 && removed.has(columnWindowIds[0]),
    )
  }

  clearWindow = () => {
    log.debug('clearWindow')
    const renderedLayoutBefore = this.getRenderedLayoutSnapshot().layout
    const removedWindowIds: number[] = []
    for (let index = 0; index < this.windows.length; ) {
      if (this.windows[index].tabs.length === 0) {
        removedWindowIds.push(this.windows[index].id)
        this.windows.splice(index, 1)
      } else {
        index++
      }
    }
    if (!removedWindowIds.length) {
      return {
        removedWindowIds,
        repacked: false,
      }
    }
    if (
      this.shouldRepackForRemovedWindows(removedWindowIds, renderedLayoutBefore)
    ) {
      this.repackLayout('window-change')
      return {
        removedWindowIds,
        repacked: true,
      }
    }
    this.markLayoutDirtyIfNeeded('tab-browser-event')
    return {
      removedWindowIds,
      repacked: false,
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
    await win.onAttched(tabId, attachInfo)
    this.markLayoutDirtyIfNeeded('tab-browser-event', newWindowId)
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
      this.repackLayout('window-change')
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
    const result = this.clearWindow()
    if (!result.repacked) {
      this.markLayoutDirtyIfNeeded('tab-browser-event', detachInfo.oldWindowId)
    }
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
      const result = this.clearWindow()
      if (!result.repacked) {
        this.markLayoutDirtyIfNeeded('tab-browser-event', windowId)
      }
    }
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
      this.repackLayout('window-change')
    } else {
      win.add(new Tab(tab, this.store, win), index)
      this.markLayoutDirtyIfNeeded('tab-browser-event', windowId)
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
    this.markLayoutDirtyIfNeeded('tab-browser-event', moveInfo.windowId)
  }

  suspend = () => {
    this.batching = true
  }

  resume = (options?: LoadAllWindowsOptions) => {
    this.batching = false
    this.getAllWindows(options)
  }

  removeTabs = (ids: number[]) => {
    const set = new Set(ids)
    this.windows.forEach((win) => win.removeTabs(set))
    const result = this.clearWindow()
    if (!result.repacked) {
      this.markLayoutDirtyIfNeeded('tab-browser-event')
    }
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
    const viewportHeight =
      typeof window !== 'undefined' ? window.innerHeight || 0 : 0
    const viewportWidth =
      typeof window !== 'undefined' ? window.innerWidth || 0 : 0
    const viewportChanged =
      viewportHeight !== this.lastViewportHeight ||
      viewportWidth !== this.lastViewportWidth
    this.lastViewportHeight = viewportHeight
    this.lastViewportWidth = viewportWidth

    if (this.height !== height) {
      log.debug(
        'WindowsStore.updateHeight set height from',
        this.height,
        'to',
        height,
      )
      this.height = height
      if (viewportChanged) {
        this.repackLayout('resize')
      }
    }
  }

  isLayoutRepackReason = (
    reason?: LayoutRepackReason | LayoutDirtyReason,
  ): reason is LayoutRepackReason => {
    return (
      reason === 'manual' ||
      reason === 'resize' ||
      reason === 'window-change' ||
      reason === 'settings-change' ||
      reason === 'initial-load' ||
      reason === 'sync' ||
      reason === 'visibility-hidden' ||
      reason === 'visibility-visible' ||
      reason === 'window-blur' ||
      reason === 'window-focus'
    )
  }

  resolveRepackReason = (
    reason: LayoutRepackReason | LayoutDirtyReason | undefined,
    fallback: LayoutRepackReason,
  ): LayoutRepackReason => {
    if (this.isLayoutRepackReason(reason)) {
      return reason
    }
    return fallback
  }

  resolveDirtyReason = (
    reason: LayoutRepackReason | LayoutDirtyReason | undefined,
    fallback: LayoutDirtyReason = 'window-browser-event',
  ): LayoutDirtyReason => {
    if (
      reason === 'group-toggle' ||
      reason === 'window-toggle' ||
      reason === 'group-browser-event' ||
      reason === 'tab-browser-event' ||
      reason === 'drag-drop' ||
      reason === 'arrange-change' ||
      reason === 'window-browser-event'
    ) {
      return reason
    }
    return fallback
  }

  shouldSuppressLifecycleTrigger = (family: 'background' | 'foreground') => {
    const now = Date.now()
    const last = this.lifecycleLastTriggeredAt[family]
    if (now - last < this.lifecycleSuppressionMs) {
      return true
    }
    this.lifecycleLastTriggeredAt[family] = now
    return false
  }

  refreshAndFlushLayoutForForeground = async (
    reason: 'visibility-visible' | 'window-focus',
  ) => {
    await this.loadAllWindows({
      repackPolicy: 'never',
      reason,
    })
    this.markLayoutDirtyIfNeeded('window-browser-event')
    this.flushLayoutIfDirty(reason)
  }

  onVisibilityChange = () => {
    if (typeof document === 'undefined') {
      return
    }
    if (document.visibilityState === 'hidden') {
      if (this.shouldSuppressLifecycleTrigger('background')) {
        return
      }
      this.flushLayoutIfDirty('visibility-hidden')
      return
    }
    if (document.visibilityState === 'visible') {
      if (this.shouldSuppressLifecycleTrigger('foreground')) {
        return
      }
      void this.refreshAndFlushLayoutForForeground('visibility-visible')
    }
  }

  onWindowBlur = () => {
    if (
      typeof document !== 'undefined' &&
      document.visibilityState !== 'visible'
    ) {
      return
    }
    if (this.shouldSuppressLifecycleTrigger('background')) {
      return
    }
    this.flushLayoutIfDirty('window-blur')
  }

  onWindowFocus = () => {
    if (
      typeof document !== 'undefined' &&
      document.visibilityState !== 'visible'
    ) {
      return
    }
    if (this.shouldSuppressLifecycleTrigger('foreground')) {
      return
    }
    void this.refreshAndFlushLayoutForForeground('window-focus')
  }

  bindLifecycleLayoutRefresh = () => {
    if (
      this.lifecycleListenersBound ||
      typeof document === 'undefined' ||
      typeof window === 'undefined'
    ) {
      return
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    window.addEventListener('blur', this.onWindowBlur)
    window.addEventListener('focus', this.onWindowFocus)
    this.lifecycleListenersBound = true
  }

  unbindLifecycleLayoutRefresh = () => {
    if (
      !this.lifecycleListenersBound ||
      typeof document === 'undefined' ||
      typeof window === 'undefined'
    ) {
      return
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    window.removeEventListener('blur', this.onWindowBlur)
    window.removeEventListener('focus', this.onWindowFocus)
    this.lifecycleListenersBound = false
  }

  syncAllWindows = () => {
    this.initialLoading = true
    this.loadAllWindows({
      repackPolicy: 'always',
      reason: 'sync',
    })
  }

  loadAllWindows = async (options: LoadAllWindowsOptions = {}) => {
    const { repackPolicy, reason } = options
    log.debug('loadAllWindows', { repackPolicy, reason })
    const wasInitialLoading = this.initialLoading
    const policy: LoadRepackPolicy =
      repackPolicy || (wasInitialLoading ? 'always' : 'if-clean')
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

    if (policy === 'always') {
      this.repackLayout(
        this.resolveRepackReason(
          reason,
          wasInitialLoading ? 'initial-load' : 'window-change',
        ),
      )
    } else if (policy === 'if-clean') {
      if (!this.layoutDirty) {
        this.repackLayout(
          this.resolveRepackReason(
            reason,
            wasInitialLoading ? 'initial-load' : 'window-change',
          ),
        )
      } else {
        this.markLayoutDirtyIfNeeded(this.resolveDirtyReason(reason))
      }
    } else {
      this.markLayoutDirtyIfNeeded(this.resolveDirtyReason(reason))
    }

    if (wasInitialLoading) {
      this.windowMounted()
    }
    this.initialLoading = false
    this.store.focusStore.setDefaultFocusedTab()
  }

  getAllWindows = (options?: LoadAllWindowsOptions) => {
    log.debug('getAllWindows:', { batching: this.batching })
    if (this.batching) {
      return
    }
    return this.loadAllWindows(options)
  }

  updateAllWindows = debounce(
    () =>
      this.getAllWindows({
        repackPolicy: 'never',
        reason: 'window-browser-event',
      }),
    1000,
    {
      leading: true,
      trailing: true,
    },
  )
}
