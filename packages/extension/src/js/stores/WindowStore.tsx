import { makeAutoObservable } from 'mobx'
import {
  browser,
  moveTabs,
  getLastFocusedWindowId,
  notSelfPopup,
  windowComparator,
  isSelfPopup,
  isSelfPopupTab,
} from 'libs'
import actions from 'libs/actions'
import log from 'libs/log'
import { getWindowRowHeight } from 'libs/layoutMetrics'
import Window from 'stores/Window'
import Tab from 'stores/Tab'
import Store from 'stores'
import debounce from 'lodash.debounce'
import Focusable from './Focusable'
import type { FocusOrigin } from './Focusable'
import TabGroupRow from './TabGroupRow'

export type VirtualizedWindowLayout = {
  windowId: number
  columnIndex: number
  top: number
  bottom: number
  height: number
}

export type VirtualizedColumnLayout = {
  columnIndex: number
  left: number
  right: number
  width: number
  height: number
  windows: VirtualizedWindowLayout[]
  renderedWindows: VirtualizedWindowLayout[]
}

export type VisibleRowRange = {
  start: number
  end: number
}

export type VirtualizedItemLayout = {
  columnIndex: number
  left: number
  right: number
  top: number
  bottom: number
  windowId: number
}

export type VisibleRowCountSnapshot = Array<{
  windowId: number
  visibleLength: number
}>

type LayoutRepackReason =
  | 'manual'
  | 'resize'
  | 'window-change'
  | 'settings-change'
  | 'search-change'
  | 'filter-change'
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
  preserveWindowOrder?: boolean
}

type WindowLastUsedAt = Record<string, number>

type MarkWindowLastUsedOptions = {
  markLayoutDirty?: boolean
}

const WINDOW_LAST_USED_STORAGE_KEY = 'windowLastUsedAt'
const WINDOW_TAB_HISTORY_STORAGE_KEY = 'tabHistory'

const normalizeWindowLastUsedAt = (value: unknown): WindowLastUsedAt => {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return Object.keys(value as Record<string, unknown>).reduce(
    (result, windowId) => {
      const timestamp = Number((value as Record<string, unknown>)[windowId])
      if (Number.isFinite(timestamp) && timestamp > 0) {
        result[windowId] = timestamp
      }
      return result
    },
    {} as WindowLastUsedAt,
  )
}

const mergeWindowLastUsedAt = (
  left: WindowLastUsedAt,
  right: WindowLastUsedAt,
): WindowLastUsedAt => {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  return Array.from(keys).reduce((result, windowId) => {
    const leftTimestamp = Number(left[windowId])
    const rightTimestamp = Number(right[windowId])
    const timestamp = Math.max(
      Number.isFinite(leftTimestamp) ? leftTimestamp : 0,
      Number.isFinite(rightTimestamp) ? rightTimestamp : 0,
    )
    if (Number.isFinite(timestamp) && timestamp > 0) {
      result[windowId] = timestamp
    }
    return result
  }, {} as WindowLastUsedAt)
}

const normalizeWindowLastUsedAtFromTabHistory = (
  value: unknown,
  startAt = Date.now(),
): WindowLastUsedAt => {
  if (!Array.isArray(value)) {
    return {}
  }

  let timestamp = Math.max(Date.now(), startAt)
  return value.reduce((result, entry) => {
    if (!entry || typeof entry !== 'object' || isSelfPopupTab(entry)) {
      return result
    }
    const windowId = Number((entry as { windowId?: unknown }).windowId)
    if (Number.isFinite(windowId) && windowId > 0) {
      timestamp += 1
      result[String(windowId)] = timestamp
    }
    return result
  }, {} as WindowLastUsedAt)
}

export default class WindowsStore {
  store: Store

  constructor(store: Store) {
    makeAutoObservable(this)

    this.store = store
  }

  didMount = () => {
    if (this.windowListenersBound) {
      return
    }
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
    this.windowListenersBound = true
    this.bindLifecycleLayoutRefresh()
    if (!this.initialWindowLoadStarted) {
      this.initialWindowLoadStarted = true
      this.getAllWindows()
    }
  }

  willUnmount = () => {
    if (!this.windowListenersBound) {
      return
    }
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
    this.windowListenersBound = false
    this.unbindLifecycleLayoutRefresh()
  }

  windows: Window[] = []

  initialLoading = true

  lastFocusedWindowId: number | null = null

  windowLastUsedAt: WindowLastUsedAt = {}

  windowLastUsedColumnLayout: number[][] | null = null

  windowLastUsedLayoutDirty = false

  pendingLastUsedWindowId: number | null = null

  isLastUsedWindowOrderEnabled = () =>
    this.store.userStore?.windowOrder === 'lastUsed'

  height = 600

  width = typeof window !== 'undefined' ? window.innerWidth || 0 : 0

  scrollTop = 0

  scrollLeft = 0

  batching = false

  suspendTabEvents = false

  layoutDirty = false

  dirtyWindowIds: Set<number> = new Set()

  columnLayout: number[][] = [[]]

  columnCount = 1

  lastViewportHeight =
    typeof window !== 'undefined' ? window.innerHeight || 0 : 0

  lastViewportWidth = typeof window !== 'undefined' ? window.innerWidth || 0 : 0

  windowListenersBound = false

  initialWindowLoadStarted = false

  lifecycleListenersBound = false

  lifecycleSuppressionMs = 120

  lifecycleLastTriggeredAt: Record<'background' | 'foreground', number> = {
    background: 0,
    foreground: 0,
  }

  hasAppliedInitialDefaultFocus = false

  pendingFocusedItemReveal = false

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

  get rowHeight() {
    return getWindowRowHeight(this.store.userStore?.fontSize || 14)
  }

  get minColumnWidthPx() {
    const fallbackRootFontSize = 16
    if (
      typeof document === 'undefined' ||
      typeof window === 'undefined' ||
      !window.getComputedStyle
    ) {
      return Math.round(
        (this.store.userStore?.tabWidth || 20) * fallbackRootFontSize,
      )
    }
    const rootFontSize =
      parseFloat(
        window.getComputedStyle(document.documentElement).fontSize || '16',
      ) || fallbackRootFontSize
    return Math.round((this.store.userStore?.tabWidth || 20) * rootFontSize)
  }

  get autoFitColumnsEnabled() {
    return !!this.store.userStore?.autoFitColumns
  }

  getAutoFitColumnCount = (windowCount: number) => {
    if (windowCount <= 0) {
      return 1
    }
    const width = Math.max(this.width, 0)
    const minColumnWidth = Math.max(this.minColumnWidthPx, 1)
    const fittingColumnCount =
      width > 0 ? Math.floor(width / minColumnWidth) : 0
    return Math.max(1, Math.min(windowCount, fittingColumnCount || 1))
  }

  get columnWidthPx() {
    if (this.autoFitColumnsEnabled) {
      const visibleColumn = Math.max(this.visibleColumn, 1)
      const fluidWidth =
        this.width > 0 ? Math.floor(this.width / visibleColumn) : 0
      return Math.max(1, Math.max(fluidWidth, this.minColumnWidthPx))
    }
    const visibleColumn = Math.max(this.visibleColumn, 1)
    const fluidWidth = this.width > 0 ? this.width / visibleColumn : 0
    return Math.max(1, Math.round(Math.max(fluidWidth, this.minColumnWidthPx)))
  }

  get virtualizationDisabled() {
    return !!this.store.dragStore?.dragging
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

  get columnLayoutsWithPosition(): VirtualizedColumnLayout[] {
    const columnWidth = this.columnWidthPx
    const overscanPx = this.rowHeight * 4
    const viewportTop = this.scrollTop
    const viewportBottom = this.scrollTop + this.height

    return this.windowsByColumn.map((column, columnIndex) => {
      let top = 0
      const windows = column.map((win) => {
        const height = win.visibleLength * this.rowHeight
        const layout = {
          windowId: win.id,
          columnIndex,
          top,
          bottom: top + height,
          height,
        }
        top += height
        return layout
      })

      return {
        columnIndex,
        left: columnIndex * columnWidth,
        right: (columnIndex + 1) * columnWidth,
        width: columnWidth,
        height: top,
        windows,
        renderedWindows: this.virtualizationDisabled
          ? windows
          : windows.filter(
              ({ top, bottom }) =>
                bottom >= viewportTop - overscanPx &&
                top <= viewportBottom + overscanPx,
            ),
      }
    })
  }

  get renderedColumnLayouts() {
    const layouts = this.columnLayoutsWithPosition
    if (!layouts.length || this.virtualizationDisabled) {
      return layouts
    }

    const columnWidth = Math.max(this.columnWidthPx, 1)
    const viewportLeft = this.scrollLeft
    const viewportRight = this.scrollLeft + this.width
    const overscanColumns = 1
    const start = Math.max(
      Math.floor(viewportLeft / columnWidth) - overscanColumns,
      0,
    )
    const end = Math.min(
      Math.ceil(viewportRight / columnWidth) + overscanColumns,
      layouts.length,
    )
    return layouts.slice(start, end)
  }

  get totalContentWidth() {
    if (this.autoFitColumnsEnabled) {
      return Math.max(this.width, 0)
    }
    return Math.max(this.width, this.visibleColumn * this.columnWidthPx)
  }

  get totalContentHeight() {
    return Math.max(
      this.height,
      ...this.columnLayoutsWithPosition.map((column) => column.height),
      0,
    )
  }

  getVisibleRowCountSnapshot = (): VisibleRowCountSnapshot => {
    return this.windows.map((win) => ({
      windowId: win.id,
      visibleLength: win.visibleLength,
    }))
  }

  haveVisibleRowCountsChanged = (
    previous: VisibleRowCountSnapshot = [],
  ): boolean => {
    const next = this.getVisibleRowCountSnapshot()
    if (previous.length !== next.length) {
      return true
    }
    return previous.some((item, index) => {
      const nextItem = next[index]
      return (
        nextItem?.windowId !== item.windowId ||
        nextItem?.visibleLength !== item.visibleLength
      )
    })
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

  refreshLayoutIfNeeded = (
    reason: LayoutRepackReason,
    dirtyReason: LayoutDirtyReason,
    windowId?: number,
  ) => {
    if (!this.markLayoutDirtyIfNeeded(dirtyReason, windowId)) {
      return false
    }
    this.repackLayout(reason)
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

  loadWindowLastUsedAt = async (): Promise<WindowLastUsedAt> => {
    if (!this.isLastUsedWindowOrderEnabled() || !browser.storage?.local) {
      return {}
    }
    try {
      const stored = await browser.storage.local.get({
        [WINDOW_LAST_USED_STORAGE_KEY]: {},
        [WINDOW_TAB_HISTORY_STORAGE_KEY]: [],
      })
      const storedLastUsedAt = normalizeWindowLastUsedAt(
        stored[WINDOW_LAST_USED_STORAGE_KEY],
      )
      const baselineLastUsedAt = mergeWindowLastUsedAt(
        this.windowLastUsedAt,
        storedLastUsedAt,
      )
      if (Object.keys(baselineLastUsedAt).length > 0) {
        return storedLastUsedAt
      }
      const tabHistoryLastUsedAt = normalizeWindowLastUsedAtFromTabHistory(
        stored[WINDOW_TAB_HISTORY_STORAGE_KEY],
      )
      return tabHistoryLastUsedAt
    } catch {
      return this.windowLastUsedAt
    }
  }

  persistWindowLastUsedAt = () => {
    if (!this.isLastUsedWindowOrderEnabled() || !browser.storage?.local) {
      return
    }
    browser.storage.local.set({
      [WINDOW_LAST_USED_STORAGE_KEY]: this.windowLastUsedAt,
    })
  }

  getNextWindowLastUsedAt = () => {
    const latestTimestamp = Object.values(this.windowLastUsedAt).reduce(
      (latest, timestamp) =>
        Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest,
      0,
    )
    return Math.max(Date.now(), latestTimestamp + 1)
  }

  markWindowLastUsed = (
    windowId?: number | null,
    options: MarkWindowLastUsedOptions = {},
  ) => {
    if (
      !this.isLastUsedWindowOrderEnabled() ||
      typeof windowId !== 'number' ||
      windowId <= 0
    ) {
      return false
    }
    this.pendingLastUsedWindowId = windowId
    this.windowLastUsedAt = {
      ...this.windowLastUsedAt,
      [String(windowId)]: this.getNextWindowLastUsedAt(),
    }
    this.persistWindowLastUsedAt()
    if (
      options.markLayoutDirty &&
      !this.initialLoading &&
      this.wouldWindowLastUsedLayoutChange()
    ) {
      this.windowLastUsedLayoutDirty = true
    }
    return true
  }

  pruneWindowLastUsedAt = (windowIds: Set<number>) => {
    if (!this.isLastUsedWindowOrderEnabled()) {
      return
    }
    const nextWindowLastUsedAt = Object.keys(this.windowLastUsedAt).reduce(
      (result, windowId) => {
        if (windowIds.has(Number(windowId))) {
          result[windowId] = this.windowLastUsedAt[windowId]
        }
        return result
      },
      {} as WindowLastUsedAt,
    )
    if (
      Object.keys(nextWindowLastUsedAt).length ===
      Object.keys(this.windowLastUsedAt).length
    ) {
      return
    }
    this.windowLastUsedAt = nextWindowLastUsedAt
    this.persistWindowLastUsedAt()
  }

  sortWindowsForDisplay = (
    windows: Window[],
    previousWindowOrder: Map<number, number>,
  ) =>
    windows.sort((a, b) => {
      const previousOrderA = previousWindowOrder.get(a.id)
      const previousOrderB = previousWindowOrder.get(b.id)
      const hasPreviousOrderA = typeof previousOrderA === 'number'
      const hasPreviousOrderB = typeof previousOrderB === 'number'

      if (hasPreviousOrderA && hasPreviousOrderB) {
        return previousOrderA - previousOrderB
      }

      if (hasPreviousOrderA) {
        return -1
      }

      if (hasPreviousOrderB) {
        return 1
      }

      return windowComparator(a, b)
    })

  normalizeWindowLastUsedColumnLayout = (
    layout: number[][] | null,
    windows: Window[],
    fallbackLayout: number[][],
  ) => {
    if (!layout?.length) {
      return fallbackLayout.length > 0 ? fallbackLayout : [[]]
    }
    const visibleWindowIds = new Set(windows.map((win) => win.id))
    const seen = new Set<number>()
    const layoutColumnCount = Math.max(layout.length, 1)
    const fallbackColumnCount = Math.max(fallbackLayout.length, 1)
    const columnCount = Math.max(layoutColumnCount, fallbackColumnCount, 1)
    const columns = Array.from({ length: columnCount }, (_, columnIndex) =>
      (layout[columnIndex] || []).filter((windowId) => {
        if (!visibleWindowIds.has(windowId) || seen.has(windowId)) {
          return false
        }
        seen.add(windowId)
        return true
      }),
    )

    fallbackLayout.forEach((column, columnIndex) => {
      column.forEach((windowId) => {
        if (!visibleWindowIds.has(windowId) || seen.has(windowId)) {
          return
        }
        columns[Math.min(columnIndex, columns.length - 1)].push(windowId)
        seen.add(windowId)
      })
    })

    windows.forEach((win) => {
      if (!seen.has(win.id)) {
        columns[0].push(win.id)
        seen.add(win.id)
      }
    })

    const shouldReflowColumns =
      layoutColumnCount !== fallbackColumnCount ||
      columns.some(
        (column, columnIndex) =>
          column.length === 0 && (fallbackLayout[columnIndex]?.length || 0) > 0,
      )

    if (shouldReflowColumns) {
      const windowIds = this.getWindowIdOrderFromColumnLayout(columns, windows)
      return this.computeColumnLayoutFromWindowIds(windows, windowIds).layout
    }

    const compactColumns = columns.filter((column) => column.length > 0)
    return compactColumns.length > 0 ? compactColumns : [[]]
  }

  getWindowIdOrderFromColumnLayout = (
    layout: number[][],
    windows: Window[],
  ) => {
    const visibleWindowIds = new Set(windows.map((win) => win.id))
    const seen = new Set<number>()
    const orderedWindowIds: number[] = []

    layout.forEach((column) => {
      column.forEach((windowId) => {
        if (!visibleWindowIds.has(windowId) || seen.has(windowId)) {
          return
        }
        orderedWindowIds.push(windowId)
        seen.add(windowId)
      })
    })

    windows.forEach((win) => {
      if (!seen.has(win.id)) {
        orderedWindowIds.push(win.id)
        seen.add(win.id)
      }
    })

    return orderedWindowIds
  }

  promoteWindowIdsInOrder = (
    windowIds: number[],
    windowIdsToPromote: number[],
  ) => {
    if (!windowIdsToPromote.length) {
      return windowIds
    }
    const windowIdSet = new Set(windowIds)
    const promotedWindowIds = windowIdsToPromote.filter((windowId) =>
      windowIdSet.has(windowId),
    )
    const promotedWindowIdSet = new Set(promotedWindowIds)
    return [
      ...promotedWindowIds,
      ...windowIds.filter((windowId) => !promotedWindowIdSet.has(windowId)),
    ]
  }

  computeColumnLayoutFromWindowIds = (
    windows: Window[],
    windowIds: number[],
  ) => {
    const windowById = new Map(windows.map((win) => [win.id, win]))
    const orderedWindows = windowIds
      .map((windowId) => windowById.get(windowId))
      .filter((win): win is Window => !!win)
    const seen = new Set(orderedWindows.map((win) => win.id))

    windows.forEach((win) => {
      if (!seen.has(win.id)) {
        orderedWindows.push(win)
        seen.add(win.id)
      }
    })

    return this.computeBaseColumnLayout(orderedWindows)
  }

  getLastUsedWindowIds = (windows: Window[]) => {
    const visibleWindowIds = new Set(windows.map((win) => win.id))
    return Object.entries(this.windowLastUsedAt)
      .map(([windowId, timestamp]) => ({
        windowId: Number(windowId),
        timestamp,
      }))
      .filter(
        ({ windowId, timestamp }) =>
          visibleWindowIds.has(windowId) &&
          Number.isFinite(timestamp) &&
          timestamp > 0,
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(({ windowId }) => windowId)
  }

  getWindowIdsToPromoteByLastUsed = (windows: Window[]) => {
    const visibleWindowIds = new Set(windows.map((win) => win.id))
    if (
      typeof this.pendingLastUsedWindowId === 'number' &&
      visibleWindowIds.has(this.pendingLastUsedWindowId)
    ) {
      return [this.pendingLastUsedWindowId]
    }
    const [lastUsedWindowId] = this.getLastUsedWindowIds(windows)
    return typeof lastUsedWindowId === 'number' ? [lastUsedWindowId] : []
  }

  getLastUsedPromotedColumnLayout = (
    windows: Window[],
    sourceLayout: number[][] = this.columnLayout,
  ) => {
    const fallbackLayout = this.computeBaseColumnLayout(windows).layout
    const currentLayout = this.normalizeWindowLastUsedColumnLayout(
      sourceLayout,
      windows,
      fallbackLayout,
    )
    const windowIdsToPromote = this.getWindowIdsToPromoteByLastUsed(windows)
    if (!windowIdsToPromote.length) {
      return {
        currentLayout,
        layout: currentLayout,
        windowIdsToPromote,
      }
    }
    const currentWindowIds = this.getWindowIdOrderFromColumnLayout(
      currentLayout,
      windows,
    )
    const nextWindowIds = this.promoteWindowIdsInOrder(
      currentWindowIds,
      windowIdsToPromote,
    )
    const nextLayout = this.computeColumnLayoutFromWindowIds(
      windows,
      nextWindowIds,
    ).layout
    return {
      currentLayout,
      layout: this.normalizeWindowLastUsedColumnLayout(
        nextLayout,
        windows,
        fallbackLayout,
      ),
      windowIdsToPromote,
    }
  }

  hasWindowLastUsedLayoutCandidate = () =>
    this.isLastUsedWindowOrderEnabled() &&
    this.getWindowIdsToPromoteByLastUsed(this.visibleWindows).length > 0

  wouldWindowLastUsedLayoutChange = () => {
    if (!this.isLastUsedWindowOrderEnabled() || !this.visibleWindows.length) {
      return false
    }
    const { currentLayout, layout, windowIdsToPromote } =
      this.getLastUsedPromotedColumnLayout(this.visibleWindows)
    return (
      windowIdsToPromote.length > 0 && !this.isSameLayout(currentLayout, layout)
    )
  }

  shouldApplyWindowLastUsedLayout = (
    reason: LayoutRepackReason | LayoutDirtyReason | undefined,
    wasInitialLoading = false,
  ) =>
    this.isLastUsedWindowOrderEnabled() &&
    (wasInitialLoading ||
      reason === 'sync' ||
      reason === 'manual' ||
      reason === 'settings-change')

  computeBaseColumnLayout = (windows: Window[]) => {
    if (this.autoFitColumnsEnabled) {
      return this.computeAutoFitColumnLayout(windows)
    }
    return this.computePackedColumnLayout(windows)
  }

  applyWindowLastUsedLayout = (reason: LayoutRepackReason) => {
    if (!this.isLastUsedWindowOrderEnabled()) {
      return false
    }
    const visibleWindows = this.visibleWindows
    if (!visibleWindows.length) {
      this.windowLastUsedColumnLayout = null
      this.pendingLastUsedWindowId = null
      this.windowLastUsedLayoutDirty = false
      return false
    }
    const { layout: normalizedNextLayout, windowIdsToPromote } =
      this.getLastUsedPromotedColumnLayout(visibleWindows)
    if (!windowIdsToPromote.length) {
      this.windowLastUsedLayoutDirty = false
      return false
    }
    if (this.isSameLayout(this.columnLayout, normalizedNextLayout)) {
      this.windowLastUsedColumnLayout = normalizedNextLayout
      this.layoutDirty = false
      this.dirtyWindowIds.clear()
      this.pendingLastUsedWindowId = null
      this.windowLastUsedLayoutDirty = false
      return true
    }
    this.windowLastUsedColumnLayout = normalizedNextLayout
    this.columnLayout = normalizedNextLayout
    this.columnCount = Math.max(normalizedNextLayout.length, 1)
    this.layoutDirty = false
    this.dirtyWindowIds.clear()
    this.pendingLastUsedWindowId = null
    this.windowLastUsedLayoutDirty = false
    log.debug('WindowsStore.applyWindowLastUsedLayout', {
      reason,
      layout: normalizedNextLayout,
      windowIdsToPromote,
    })
    return true
  }

  computePackedColumnLayout = (windows: Window[]) => {
    if (!windows.length) {
      return {
        layout: [[]],
        columnCount: 1,
      }
    }

    const tabHeight = this.rowHeight
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

  computeAutoFitColumnLayout = (windows: Window[]) => {
    if (!windows.length) {
      return {
        layout: [[]],
        columnCount: 1,
      }
    }

    const tabHeight = this.rowHeight
    const columnCount = this.getAutoFitColumnCount(windows.length)
    const layout = Array.from({ length: columnCount }, () => [] as number[])
    const columnHeights = Array.from({ length: columnCount }, () => 0)

    windows.forEach((win) => {
      const winHeight = win.visibleLength * tabHeight
      let columnIndex = 0
      for (
        let candidateColumnIndex = 1;
        candidateColumnIndex < columnCount;
        candidateColumnIndex += 1
      ) {
        if (columnHeights[candidateColumnIndex] < columnHeights[columnIndex]) {
          columnIndex = candidateColumnIndex
        }
      }
      layout[columnIndex].push(win.id)
      columnHeights[columnIndex] += winHeight
    })

    return {
      layout,
      columnCount,
    }
  }

  computeColumnLayout = (windows: Window[]) => {
    const computed = this.computeBaseColumnLayout(windows)
    if (
      !this.isLastUsedWindowOrderEnabled() ||
      !this.windowLastUsedColumnLayout
    ) {
      return computed
    }
    const layout = this.normalizeWindowLastUsedColumnLayout(
      this.windowLastUsedColumnLayout,
      windows,
      computed.layout,
    )
    return {
      layout,
      columnCount: Math.max(layout.length, 1),
    }
  }

  shouldResetWindowLastUsedColumnLayoutForRepack = (
    reason: LayoutRepackReason,
  ) =>
    this.isLastUsedWindowOrderEnabled() &&
    (reason === 'settings-change' ||
      reason === 'resize' ||
      reason === 'window-change' ||
      reason === 'search-change' ||
      reason === 'filter-change')

  flushLayoutIfDirty = (reason: LayoutRepackReason) => {
    if (this.windowLastUsedLayoutDirty || this.layoutDirty) {
      if (this.hasWindowLastUsedLayoutCandidate()) {
        const applied = this.applyWindowLastUsedLayout(reason)
        if (applied) {
          return true
        }
      }
      this.windowLastUsedLayoutDirty = false
    }
    if (!this.layoutDirty) {
      return false
    }
    this.repackLayout(reason)
    return true
  }

  repackLayout = (reason: LayoutRepackReason) => {
    const hadWindowLastUsedLayoutDirty = this.windowLastUsedLayoutDirty
    if (
      this.layoutDirty ||
      this.shouldResetWindowLastUsedColumnLayoutForRepack(reason)
    ) {
      this.windowLastUsedColumnLayout = null
    }
    const { layout, columnCount } = this.computeColumnLayout(
      this.visibleWindows,
    )
    this.columnLayout = layout
    this.columnCount = columnCount
    this.layoutDirty = false
    this.dirtyWindowIds.clear()
    if (hadWindowLastUsedLayoutDirty) {
      this.windowLastUsedLayoutDirty = this.wouldWindowLastUsedLayoutChange()
    }
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
    this.markWindowLastUsed(win.id)
    await this.getOrCreateWinById(win.id)
  }

  onAttached = async (tabId: number, attachInfo) => {
    if (this.suspendTabEvents) {
      return
    }
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
      this.markWindowLastUsed(windowId)
      this.windows.push(win)
      this.repackLayout('window-change')
    }
    return win
  }

  onDetached = (tabId: number, detachInfo) => {
    if (this.suspendTabEvents) {
      return
    }
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
    if (this.suspendTabEvents) {
      return
    }
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
    if (this.suspendTabEvents) {
      return
    }
    log.debug('tabs.onUpdated:', { tabId, changeInfo, newTab })
    const tab = this.tabs.find((x) => x.id === tabId)
    if (tab) {
      const queryActive = !!this.store.searchStore?._query
      const previousGroupId = tab.groupId
      const previousTitle = tab.title
      const previousUrl = tab.url
      const previousWindowId = tab.windowId
      Object.assign(tab, newTab)
      tab.setUrlIcon()
      if (previousGroupId !== tab.groupId) {
        this.refreshLayoutIfNeeded(
          'window-change',
          'tab-browser-event',
          tab.windowId || previousWindowId,
        )
        return
      }
      const searchFieldsChanged =
        queryActive && (previousTitle !== tab.title || previousUrl !== tab.url)
      if (searchFieldsChanged) {
        this.repackLayout('search-change')
        this.store.searchStore?.clearFilteredFocusedTab?.()
      }
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
      this.markWindowLastUsed(windowId, { markLayoutDirty: true })
    }
  }

  onCreated = (tab: Tab) => {
    if (this.suspendTabEvents) {
      return
    }
    log.debug('tabs.onCreated:', { tab })
    const { index, windowId } = tab
    const win = this.windows.find((x) => x.id === windowId)
    if (!win) {
      this.markWindowLastUsed(windowId)
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
    if (this.suspendTabEvents) {
      return
    }
    const { tabId, windowId } = args
    log.debug('tabs.onActivate:', { tabId, windowId })
    if (typeof windowId === 'number') {
      this.lastFocusedWindowId = windowId
      this.markWindowLastUsed(windowId, { markLayoutDirty: true })
    }
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
    if (this.suspendTabEvents) {
      return
    }
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
    this.suspendTabEvents = true
  }

  resume = async (options?: LoadAllWindowsOptions) => {
    this.batching = false
    try {
      await this.getAllWindows(options)
    } finally {
      this.suspendTabEvents = false
    }
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
    this.windows.forEach((win) => {
      win.showTabs = true
    })
  }

  flushPendingFocusedItemReveal = () => {
    if (!this.pendingFocusedItemReveal) {
      return false
    }
    const { focusStore } = this.store
    const focusedItem = focusStore?.focusedItem
    if (!focusedItem) {
      this.pendingFocusedItemReveal = false
      return false
    }
    if (
      !focusStore?.containerRef?.current ||
      !this.getItemLayout(focusedItem)
    ) {
      return false
    }
    this.pendingFocusedItemReveal = false
    focusStore.revealItem(focusedItem)
    return true
  }

  focusActiveTabInLastFocusedWindow = ({
    origin = 'programmatic',
    moveDomFocus = true,
    reveal = false,
  }: {
    origin?: FocusOrigin
    moveDomFocus?: boolean
    reveal?: boolean
  } = {}) => {
    const { lastFocusedWindow } = this
    if (!lastFocusedWindow || lastFocusedWindow.hide) {
      return false
    }
    const activeTab = lastFocusedWindow.tabs.find((tab) => tab.active)
    if (!activeTab?.isVisible) {
      return false
    }
    this.store.focusStore?.focus(activeTab, {
      origin,
      moveDomFocus,
      reveal,
    })
    return true
  }

  getWindowLayout = (windowId: number) => {
    for (const column of this.columnLayoutsWithPosition) {
      const layout = column.windows.find((windowLayout) => {
        return windowLayout.windowId === windowId
      })
      if (layout) {
        return layout
      }
    }
    return null
  }

  getVisibleRowRange = (win: Window): VisibleRowRange => {
    const rows = win.rows
    if (
      this.virtualizationDisabled ||
      win.hide ||
      rows.length === 0 ||
      this.height <= 0
    ) {
      return {
        start: 0,
        end: rows.length,
      }
    }

    const layout = this.getWindowLayout(win.id)
    if (!layout) {
      return {
        start: 0,
        end: rows.length,
      }
    }

    const rowsTop = layout.top + this.rowHeight
    const overscanPx = this.rowHeight * 4
    const viewportTop = this.scrollTop - overscanPx
    const viewportBottom = this.scrollTop + this.height + overscanPx
    const start = Math.max(
      Math.floor((viewportTop - rowsTop) / this.rowHeight),
      0,
    )
    const end = Math.min(
      Math.ceil((viewportBottom - rowsTop) / this.rowHeight),
      rows.length,
    )

    return {
      start,
      end: Math.max(start, end),
    }
  }

  getItemLayout = (item: Focusable | null): VirtualizedItemLayout | null => {
    if (!item) {
      return null
    }

    let win: Window = null
    let rowIndex = -1

    if (item instanceof Window) {
      win = item
    } else if (item instanceof Tab) {
      win = item.win
      rowIndex = win.rows.findIndex(
        (row) => row.kind === 'tab' && row.tabId === item.id,
      )
    } else if (item instanceof TabGroupRow) {
      win = this.windows.find((candidate) => candidate.id === item.windowId)
      rowIndex =
        win?.rows.findIndex(
          (row) => row.kind === 'group' && row.groupId === item.groupId,
        ) ?? -1
    }

    if (!win) {
      return null
    }

    const windowLayout = this.getWindowLayout(win.id)
    const columnLayout = this.columnLayoutsWithPosition.find((column) => {
      return column.columnIndex === windowLayout?.columnIndex
    })

    if (!windowLayout || !columnLayout) {
      return null
    }

    const top =
      rowIndex === -1
        ? windowLayout.top
        : windowLayout.top + this.rowHeight * (rowIndex + 1)

    return {
      columnIndex: windowLayout.columnIndex,
      left: columnLayout.left,
      right: columnLayout.right,
      top,
      bottom: top + this.rowHeight,
      windowId: win.id,
    }
  }

  get lastFocusedWindow() {
    return this.windows.find((x) => x.lastFocused)
  }

  get duplicateFamiliesByFingerprint() {
    return this.tabs.reduce((acc, tab) => {
      const family = acc.get(tab.fingerPrint)
      if (family) {
        family.push(tab)
      } else {
        acc.set(tab.fingerPrint, [tab])
      }
      return acc
    }, new Map<string, Tab[]>())
  }

  get duplicateTabsToRemove() {
    return Array.from(this.duplicateFamiliesByFingerprint.values())
      .filter((family) => family.length > 1)
      .flatMap((family) => family.slice(1))
  }

  get tabFingerprintMap() {
    return Array.from(this.duplicateFamiliesByFingerprint.entries()).reduce(
      (acc: { [key: string]: number }, [fingerPrint, family]) => {
        acc[fingerPrint] = family.length
        return acc
      },
      {},
    )
  }

  get duplicatedTabs() {
    return Array.from(this.duplicateFamiliesByFingerprint.values()).flatMap(
      (family) => (family.length > 1 ? family : []),
    )
  }

  isAllVisibleTabScope = (tabs: Tab[]) => {
    const currentTabIds = new Set(this.tabs.map((tab) => tab.id))
    if (tabs.length !== currentTabIds.size) {
      return false
    }
    return tabs.every((tab) => currentTabIds.has(tab.id))
  }

  getDuplicateFamilyMap = (tabs: Tab[] = this.tabs) => {
    if (this.isAllVisibleTabScope(tabs)) {
      return this.duplicateFamiliesByFingerprint
    }

    const scopedTabIds = new Set(tabs.map((tab) => tab.id))
    return Array.from(this.duplicateFamiliesByFingerprint.entries()).reduce(
      (acc, [fingerPrint, family]) => {
        const scopedFamily = family.filter((tab) => scopedTabIds.has(tab.id))
        if (scopedFamily.length > 0) {
          acc.set(fingerPrint, scopedFamily)
        }
        return acc
      },
      new Map<string, Tab[]>(),
    )
  }

  getDuplicateFamilies = (tabs: Tab[] = this.tabs) => {
    return Array.from(this.getDuplicateFamilyMap(tabs).entries()).reduce(
      (acc: { [key: string]: Tab[] }, [fingerPrint, family]) => {
        acc[fingerPrint] = family
        return acc
      },
      {},
    )
  }

  getDuplicateTabsToRemove = (tabs: Tab[] = this.tabs) => {
    if (this.isAllVisibleTabScope(tabs)) {
      return this.duplicateTabsToRemove
    }
    return Array.from(this.getDuplicateFamilyMap(tabs).values())
      .filter((family) => family.length > 1)
      .flatMap((family) => family.slice(1))
  }

  getDuplicateTabsToRemoveCount = (tabs: Tab[] = this.tabs) => {
    return this.getDuplicateTabsToRemove(tabs).length
  }

  closeDuplicatedTab = (tab: Tab) => {
    const { id, fingerPrint } = tab
    this.tabs
      .filter((x) => x.fingerPrint === fingerPrint && x.id !== id)
      .forEach((x) => x.remove())
  }

  cleanDuplicateTabs = (tabs: Tab[] = this.tabs) => {
    this.getDuplicateTabsToRemove(tabs).forEach((tab) => tab.remove())
  }

  cleanDuplicatedTabs = () => {
    this.cleanDuplicateTabs(this.tabs)
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

  updateViewport(height: number, width: number) {
    log.debug('WindowsStore.updateViewport:', {
      height,
      width,
      'this.height': this.height,
      'this.width': this.width,
    })
    const viewportHeight =
      typeof window !== 'undefined' ? window.innerHeight || 0 : 0
    const viewportWidth =
      typeof window !== 'undefined' ? window.innerWidth || 0 : 0
    this.lastViewportHeight = viewportHeight
    this.lastViewportWidth = viewportWidth

    const heightChanged = this.height !== height
    const widthChanged = this.width !== width
    if (!heightChanged && !widthChanged) {
      return
    }

    if (widthChanged) {
      this.width = width
    }

    if (heightChanged) {
      log.debug(
        'WindowsStore.updateViewport set height from',
        this.height,
        'to',
        height,
      )
      this.height = height
      this.repackLayout('resize')
      return
    }

    if (widthChanged && this.autoFitColumnsEnabled) {
      this.repackLayout('resize')
    }
  }

  updateHeight(height: number) {
    this.updateViewport(height, this.width)
  }

  updateScroll = (scrollTop: number, scrollLeft: number) => {
    if (this.scrollTop !== scrollTop) {
      this.scrollTop = scrollTop
    }
    if (this.scrollLeft !== scrollLeft) {
      this.scrollLeft = scrollLeft
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
      reason === 'search-change' ||
      reason === 'filter-change' ||
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

  syncAllWindows = async ({
    revealActiveTab = false,
    origin = 'programmatic',
    moveDomFocus = true,
  }: {
    revealActiveTab?: boolean
    origin?: FocusOrigin
    moveDomFocus?: boolean
  } = {}) => {
    this.initialLoading = true
    await this.loadAllWindows({
      repackPolicy: 'always',
      reason: 'sync',
    })
    if (revealActiveTab) {
      this.pendingFocusedItemReveal = this.focusActiveTabInLastFocusedWindow({
        origin,
        moveDomFocus,
        reveal: false,
      })
    }
  }

  repackLayoutAndRevealActiveTab = (origin: FocusOrigin = 'programmatic') => {
    if (this.hasWindowLastUsedLayoutCandidate()) {
      this.applyWindowLastUsedLayout('manual')
    } else {
      this.windowLastUsedLayoutDirty = false
      this.repackLayout('manual')
    }
    this.focusActiveTabInLastFocusedWindow({
      origin,
      reveal: true,
    })
  }

  loadAllWindows = async (options: LoadAllWindowsOptions = {}) => {
    if (!this.initialWindowLoadStarted) {
      this.initialWindowLoadStarted = true
    }
    const { repackPolicy, reason, preserveWindowOrder = true } = options
    log.debug('loadAllWindows', { repackPolicy, reason, preserveWindowOrder })
    const wasInitialLoading = this.initialLoading
    const policy: LoadRepackPolicy =
      repackPolicy || (wasInitialLoading ? 'always' : 'if-clean')
    const resolvedRepackReason = this.resolveRepackReason(
      reason,
      wasInitialLoading ? 'initial-load' : 'window-change',
    )
    const [windows, storedLastFocusedWindowId, currentWindow] =
      await Promise.all([
        browser.windows.getAll({
          populate: true,
        }),
        getLastFocusedWindowId(),
        browser.windows
          .getCurrent({
            populate: true,
          })
          .catch(() => null),
      ])
    const shouldApplyWindowLastUsedLayout =
      this.shouldApplyWindowLastUsedLayout(reason, wasInitialLoading)
    const windowLastUsedAt = await this.loadWindowLastUsedAt()
    this.windowLastUsedAt = mergeWindowLastUsedAt(
      this.windowLastUsedAt,
      windowLastUsedAt,
    )
    const currentFocusedWindowId =
      currentWindow &&
      currentWindow.focused &&
      !isSelfPopup(currentWindow) &&
      typeof currentWindow.id === 'number'
        ? currentWindow.id
        : null
    this.lastFocusedWindowId =
      currentFocusedWindowId ?? storedLastFocusedWindowId
    log.debug('lastFocusedWindowId:', this.lastFocusedWindowId)
    const previousWindowOrder = preserveWindowOrder
      ? new Map(this.windows.map((win, index) => [win.id, index]))
      : new Map<number, number>()

    const nextWindows = windows
      .filter(notSelfPopup)
      .filter((win) => this.store.userStore.showAppWindow || win.type !== 'app')
      .map((win) => new Window(win, this.store))

    if (this.isLastUsedWindowOrderEnabled()) {
      const liveWindowIds = new Set(nextWindows.map((win) => win.id))
      this.pruneWindowLastUsedAt(liveWindowIds)
    } else {
      this.windowLastUsedColumnLayout = null
      this.pendingLastUsedWindowId = null
      this.windowLastUsedLayoutDirty = false
    }

    this.windows = this.sortWindowsForDisplay(nextWindows, previousWindowOrder)

    const applyWindowLastUsedLayoutIfAvailable = () => {
      if (!shouldApplyWindowLastUsedLayout) {
        return false
      }
      if (!this.hasWindowLastUsedLayoutCandidate()) {
        this.windowLastUsedLayoutDirty = false
        return false
      }
      return this.applyWindowLastUsedLayout(resolvedRepackReason)
    }

    if (policy === 'always') {
      if (!applyWindowLastUsedLayoutIfAvailable()) {
        this.repackLayout(resolvedRepackReason)
      }
    } else if (policy === 'if-clean') {
      if (!this.layoutDirty) {
        if (!applyWindowLastUsedLayoutIfAvailable()) {
          this.repackLayout(resolvedRepackReason)
        }
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
    if (
      !this.hasAppliedInitialDefaultFocus &&
      this.store.focusStore?.setDefaultFocusedTabWithOptions
    ) {
      this.hasAppliedInitialDefaultFocus = true
      this.pendingFocusedItemReveal =
        this.store.focusStore.setDefaultFocusedTabWithOptions({
          reveal: false,
          fallbackWhenActiveHidden: false,
        }) === true
    }
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
