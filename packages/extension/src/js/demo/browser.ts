/// <reference types="webpack-env" />
import {
  createDemoFixture,
  createDemoIcon,
  createDemoWindow,
  createSampleTab,
  demoScenarios,
  DemoGroup,
  DemoHistoryItem,
  DemoScenarioId,
  DemoTab,
  DemoWindow,
} from './fixtures'

export { demoScenarios } from './fixtures'

// This module replaces webextension-polyfill only in the dedicated demo build.
// It never reads window.chrome, real tabs, or any persistent browser storage.
const clone = <T>(value: T): T =>
  value === undefined ? value : JSON.parse(JSON.stringify(value))

type EventListener = (...args: any[]) => unknown

class DemoEvent {
  private listeners = new Set<EventListener>()

  addListener = (listener: EventListener) => {
    this.listeners.add(listener)
  }
  removeListener = (listener: EventListener) => {
    this.listeners.delete(listener)
  }
  hasListener = (listener: EventListener) => this.listeners.has(listener)
  hasListeners = () => this.listeners.size > 0

  emit = (...args: unknown[]) => {
    this.listeners.forEach((listener) => {
      try {
        const result = listener(...clone(args))
        if (
          result &&
          typeof (result as Promise<unknown>).catch === 'function'
        ) {
          void (result as Promise<unknown>).catch(reportError)
        }
      } catch (error) {
        reportError(error)
      }
    })
  }
}

const initialScenario = (() => {
  if (typeof window === 'undefined') return 'workspace'
  const requested = new URLSearchParams(window.location.hash.slice(1)).get(
    'scenario',
  )
  return demoScenarios.some((scenario) => scenario.id === requested)
    ? (requested as DemoScenarioId)
    : 'workspace'
})()

const fixture = createDemoFixture(initialScenario)
const windows = fixture.windows
const groups = new Map(fixture.groups.map((group) => [group.id, group]))
const history = fixture.history
let nextTabId = fixture.nextTabId
let nextWindowId = fixture.nextWindowId
let nextGroupId = fixture.nextGroupId
let currentWindowId = windows[0]?.id ?? null
let revision = 0
let activityId = 0
const activity: Array<{ id: number; message: string; time: number }> = []
const subscribers = new Set<() => void>()
const getTabsFromWindows = (sourceWindows = windows) =>
  sourceWindows.reduce<DemoTab[]>((result, win) => result.concat(win.tabs), [])
const tabHistory = getTabsFromWindows(windows.slice().reverse())
  .filter((tab) => tab.active)
  .map((tab) => ({ tabId: tab.id, windowId: tab.windowId }))
const localData: Record<string, unknown> = {
  lastFocusedWindowId: currentWindowId,
  tabHistory: clone(tabHistory),
}
const syncData: Record<string, unknown> = {
  autoFocusSearch: false,
  searchHistory: true,
  useSystemTheme: false,
  darkTheme:
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.hash.slice(1)).get('theme') === 'dark',
}

export const getDemoState = () => ({
  scenario: initialScenario,
  windowCount: windows.length,
  tabCount: windows.reduce((count, win) => count + win.tabs.length, 0),
  groupCount: groups.size,
  revision,
  activity: clone(activity),
})

export const getDemoSnapshot = () =>
  clone({
    windows,
    groups: Array.from(groups.values()),
    history,
    storage: { local: localData, sync: syncData },
  })

export const subscribeDemo = (listener: () => void) => {
  subscribers.add(listener)
  return () => {
    subscribers.delete(listener)
  }
}

const notify = () => {
  revision += 1
  subscribers.forEach((subscriber) => subscriber())
}

const record = (message: string) => {
  activity.unshift({ id: ++activityId, message, time: Date.now() })
  activity.splice(8)
  notify()
}

const reportError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error('Demo runtime:', error)
  record(`Unable to finish demo action: ${message}`)
}

const requireWindow = (id: number) => {
  const win = windows.find((candidate) => candidate.id === id)
  if (!win) throw new Error(`No demo window with id ${id}`)
  return win
}

const requireTab = (id: number) => {
  const tab = getTabsFromWindows().find((candidate) => candidate.id === id)
  if (!tab) throw new Error(`No demo tab with id ${id}`)
  return tab
}

const requireGroup = (id: number) => {
  const group = groups.get(id)
  if (!group) throw new Error(`No demo group with id ${id}`)
  return group
}

const reindex = (win: DemoWindow) => {
  win.tabs.forEach((tab, index) => {
    tab.index = index
    tab.windowId = win.id
  })
}

const getWindowResult = (win: DemoWindow, populate = false) => {
  const result: Partial<DemoWindow> = clone(win)
  if (!populate) delete result.tabs
  return result
}

const removeEmptyGroups = () => {
  const usedGroups = new Set(getTabsFromWindows().map((tab) => tab.groupId))
  groups.forEach((group, id) => {
    if (!usedGroups.has(id)) {
      groups.delete(id)
      browser.tabGroups.onRemoved.emit(group)
    }
  })
}

const rememberActivation = (tab: DemoTab) => {
  const previous = tabHistory.findIndex((entry) => entry.tabId === tab.id)
  if (previous >= 0) tabHistory.splice(previous, 1)
  tabHistory.push({ tabId: tab.id, windowId: tab.windowId })
  tabHistory.splice(0, Math.max(0, tabHistory.length - 100))
  localData.tabHistory = clone(tabHistory)
}

const activate = (tab: DemoTab) => {
  const win = requireWindow(tab.windowId)
  const changed = !tab.active
  win.tabs.forEach((candidate) => {
    candidate.active = candidate.id === tab.id
    candidate.highlighted = candidate.active
  })
  rememberActivation(tab)
  if (changed)
    browser.tabs.onActivated.emit({ tabId: tab.id, windowId: win.id })
}

const focusWindow = (win: DemoWindow) => {
  const changed = currentWindowId !== win.id || !win.focused
  windows.forEach((candidate) => {
    candidate.focused = candidate.id === win.id
  })
  currentWindowId = win.id
  localData.lastFocusedWindowId = win.id
  const active = win.tabs.find((tab) => tab.active)
  if (active) rememberActivation(active)
  if (changed) browser.windows.onFocusChanged.emit(win.id)
}

const ensureActiveTab = (win: DemoWindow, nearIndex = 0) => {
  if (win.tabs.length && !win.tabs.some((tab) => tab.active)) {
    activate(win.tabs[Math.min(Math.max(nearIndex, 0), win.tabs.length - 1)])
  }
}

const removeEmptyWindow = (win: DemoWindow) => {
  if (win.tabs.length) return
  const index = windows.indexOf(win)
  if (index < 0) return
  windows.splice(index, 1)
  browser.windows.onRemoved.emit(win.id)
  if (currentWindowId === win.id) {
    currentWindowId = null
    if (windows.length) focusWindow(windows[0])
    else {
      localData.lastFocusedWindowId = null
      browser.windows.onFocusChanged.emit(-1)
    }
  }
}

const clampIndex = (tabs: DemoTab[], tab: DemoTab, requested: number) => {
  const pinnedCount = tabs.filter((candidate) => candidate.pinned).length
  const index =
    requested === -1
      ? tabs.length
      : Math.max(0, Math.min(requested, tabs.length))
  return tab.pinned
    ? Math.min(index, pinnedCount)
    : Math.max(index, pinnedCount)
}

const avoidSplittingGroup = (
  tabs: DemoTab[],
  index: number,
  ownGroupId = -1,
) => {
  const previous = tabs[index - 1]
  const next = tabs[index]
  if (
    previous &&
    next &&
    previous.groupId !== -1 &&
    previous.groupId === next.groupId &&
    next.groupId !== ownGroupId
  ) {
    let end = index
    while (end < tabs.length && tabs[end].groupId === next.groupId) end += 1
    return end
  }
  return index
}

const updateGroupId = (tab: DemoTab, groupId: number) => {
  if (tab.groupId === groupId) return
  tab.groupId = groupId
  browser.tabs.onUpdated.emit(tab.id, { groupId }, tab)
}

const moveOne = (
  tab: DemoTab,
  destination: DemoWindow,
  requested: number,
  preserveGroup = false,
) => {
  const source = requireWindow(tab.windowId)
  const oldPosition = source.tabs.indexOf(tab)
  const sameWindow = source === destination
  const remaining = destination.tabs.filter(
    (candidate) => candidate.id !== tab.id,
  )
  let index = clampIndex(remaining, tab, requested)
  // A no-op move must leave a single-member group's membership intact.
  if (sameWindow && index === oldPosition) return tab
  const oldGroupId = tab.groupId
  const adjacentOwnGroup =
    remaining[index - 1]?.groupId === oldGroupId ||
    remaining[index]?.groupId === oldGroupId
  if (
    !preserveGroup &&
    oldGroupId !== -1 &&
    (!sameWindow || !adjacentOwnGroup)
  ) {
    updateGroupId(tab, -1)
  }
  index = avoidSplittingGroup(remaining, index, tab.groupId)
  if (sameWindow && index === oldPosition) {
    if (!preserveGroup) removeEmptyGroups()
    return tab
  }
  source.tabs.splice(oldPosition, 1)
  destination.tabs.splice(index, 0, tab)
  tab.windowId = destination.id
  if (!sameWindow && tab.active) {
    tab.active = false
    tab.highlighted = false
  }
  reindex(source)
  reindex(destination)
  if (sameWindow) {
    browser.tabs.onMoved.emit(tab.id, {
      windowId: source.id,
      fromIndex: oldPosition,
      toIndex: index,
    })
  } else {
    browser.tabs.onDetached.emit(tab.id, {
      oldWindowId: source.id,
      oldPosition,
    })
    browser.tabs.onAttached.emit(tab.id, {
      newWindowId: destination.id,
      newPosition: index,
    })
    ensureActiveTab(source, oldPosition)
    ensureActiveTab(destination, index)
    removeEmptyWindow(source)
  }
  if (!preserveGroup) removeEmptyGroups()
  return tab
}

const reorder = (win: DemoWindow, orderedTabs: DemoTab[]) => {
  // Sequential from/to events keep the real WindowStore's index model aligned
  // with the final order, even when several tabs become a contiguous group.
  orderedTabs.forEach((tab, index) => {
    const fromIndex = win.tabs.indexOf(tab)
    if (fromIndex === index) return
    win.tabs.splice(fromIndex, 1)
    win.tabs.splice(index, 0, tab)
    reindex(win)
    browser.tabs.onMoved.emit(tab.id, {
      windowId: win.id,
      fromIndex,
      toIndex: index,
    })
  })
}

const tabIds = (ids: number | number[]) =>
  Array.from(new Set(Array.isArray(ids) ? ids : [ids]))

const hasStorageKey = (data: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(data, key)

const pickStorageKeys = (data: Record<string, unknown>, keys: string[]) =>
  keys.reduce<Record<string, unknown>>((result, key) => {
    if (hasStorageKey(data, key)) result[key] = clone(data[key])
    return result
  }, {})

const createStorage = (data: Record<string, unknown>, area: string) => ({
  get: async (keys?: string | string[] | Record<string, unknown> | null) => {
    if (keys == null) return clone(data)
    if (typeof keys === 'string')
      return hasStorageKey(data, keys) ? { [keys]: clone(data[keys]) } : {}
    if (Array.isArray(keys)) return pickStorageKeys(data, keys)
    return clone({
      ...keys,
      ...pickStorageKeys(data, Object.keys(keys)),
    })
  },
  set: async (items: Record<string, unknown>) => {
    const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> =
      {}
    Object.keys(items).forEach((key) => {
      if (JSON.stringify(data[key]) === JSON.stringify(items[key])) return
      changes[key] = { oldValue: clone(data[key]), newValue: clone(items[key]) }
      data[key] = clone(items[key])
    })
    if (Object.keys(changes).length) {
      browser.storage.onChanged.emit(changes, area)
      notify()
    }
  },
  remove: async (keys: string | string[]) => {
    const changes: Record<string, { oldValue?: unknown }> = {}
    ;(Array.isArray(keys) ? keys : [keys]).forEach((key) => {
      if (!hasStorageKey(data, key)) return
      changes[key] = { oldValue: clone(data[key]) }
      delete data[key]
    })
    if (Object.keys(changes).length) {
      browser.storage.onChanged.emit(changes, area)
      notify()
    }
  },
  clear: async () => {
    const changes = Object.keys(data).reduce<
      Record<string, { oldValue: unknown }>
    >((result, key) => {
      result[key] = { oldValue: clone(data[key]) }
      return result
    }, {})
    Object.keys(data).forEach((key) => {
      delete data[key]
    })
    if (Object.keys(changes).length) {
      browser.storage.onChanged.emit(changes, area)
      notify()
    }
  },
})

const demoPageURL = () =>
  typeof window === 'undefined'
    ? 'http://localhost/workspace.html'
    : new URL(window.location.pathname, window.location.href).href

const isDemoURL = (url: string) => {
  try {
    const parsed = new URL(url)
    const demo = new URL(demoPageURL())
    return parsed.origin === demo.origin && parsed.pathname === demo.pathname
  } catch {
    return false
  }
}

const validateURL = (url: string) => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Demo tab URLs must be absolute URLs')
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error('The demo supports only HTTP and HTTPS sample URLs')
  }
  return parsed
}

type TabCreateProperties = {
  windowId?: number
  url?: string
  active?: boolean
  pinned?: boolean
  index?: number
  title?: string
  cookieStoreId?: string
}

const browser = {
  isDemoBrowser: true,
  storage: {
    local: createStorage(localData, 'local'),
    sync: createStorage(syncData, 'sync'),
    onChanged: new DemoEvent(),
  },
  tabs: {
    onActivated: new DemoEvent(),
    onAttached: new DemoEvent(),
    onCreated: new DemoEvent(),
    onDetached: new DemoEvent(),
    onMoved: new DemoEvent(),
    onRemoved: new DemoEvent(),
    onUpdated: new DemoEvent(),
    onReplaced: new DemoEvent(),
    get: async (id: number) => clone(requireTab(id)),
    query: async (
      query: {
        windowId?: number
        currentWindow?: boolean
        lastFocusedWindow?: boolean
        active?: boolean
        pinned?: boolean
        highlighted?: boolean
        groupId?: number
        url?: string | string[]
        title?: string
        status?: string
        windowType?: string
      } = {},
    ) => {
      const matchingWindows = windows.filter((win) => {
        if (
          query.windowId != null &&
          win.id !== (query.windowId === -2 ? currentWindowId : query.windowId)
        )
          return false
        if (
          (query.currentWindow || query.lastFocusedWindow) &&
          win.id !== currentWindowId
        )
          return false
        return !query.windowType || win.type === query.windowType
      })
      return clone(
        getTabsFromWindows(matchingWindows).filter((tab) => {
          for (const key of [
            'active',
            'pinned',
            'highlighted',
            'groupId',
            'status',
          ] as const) {
            if (query[key] != null && tab[key] !== query[key]) return false
          }
          if (
            query.title &&
            !tab.title.toLowerCase().includes(query.title.toLowerCase())
          )
            return false
          if (query.url) {
            const patterns = Array.isArray(query.url) ? query.url : [query.url]
            return patterns.some((pattern) => matchesPattern(tab.url, pattern))
          }
          return true
        }),
      )
    },
    create: async (
      properties: TabCreateProperties = {},
    ): Promise<DemoTab | undefined> => {
      if (properties.url && isDemoURL(properties.url)) {
        record('The full Tab Manager view is already open in this demo.')
        return undefined
      }
      const parsed = validateURL(properties.url ?? 'https://tab.jenny.media/')
      const win =
        properties.windowId != null
          ? requireWindow(properties.windowId)
          : currentWindowId != null
            ? requireWindow(currentWindowId)
            : createEmptyWindow()
      const tab = createSampleTab(nextTabId++, win.id, win.tabs.length)
      tab.active = false
      tab.highlighted = false
      tab.pinned = properties.pinned ?? false
      tab.url = parsed.href
      tab.title = properties.title ?? parsed.hostname
      tab.cookieStoreId = properties.cookieStoreId
      tab.favIconUrl = createDemoIcon(
        parsed.hostname
          .replace(/^www\./, '')
          .slice(0, 1)
          .toUpperCase(),
      )
      const requested = properties.index ?? -1
      const index = avoidSplittingGroup(
        win.tabs,
        clampIndex(win.tabs, tab, requested),
      )
      win.tabs.splice(index, 0, tab)
      reindex(win)
      browser.tabs.onCreated.emit(tab)
      if (properties.active !== false || win.tabs.length === 1) activate(tab)
      record(`Added “${tab.title}” to window ${win.id}.`)
      return clone(tab)
    },
    update: async (
      id: number,
      properties: {
        active?: boolean
        pinned?: boolean
        url?: string
        muted?: boolean
        highlighted?: boolean
        autoDiscardable?: boolean
      },
    ) => {
      const tab = requireTab(id)
      if (properties.url != null) validateURL(properties.url)
      const changes: Record<string, unknown> = {}
      if (properties.pinned != null && properties.pinned !== tab.pinned) {
        tab.pinned = properties.pinned
        changes.pinned = tab.pinned
        if (tab.pinned && tab.groupId !== -1) {
          tab.groupId = -1
          changes.groupId = -1
        }
        const win = requireWindow(tab.windowId)
        const remaining = win.tabs.filter((candidate) => candidate.id !== id)
        const index = remaining.filter((candidate) => candidate.pinned).length
        moveOne(tab, win, index)
      }
      if (properties.url != null && properties.url !== tab.url) {
        tab.url = new URL(properties.url).href
        tab.title = new URL(tab.url).hostname
        changes.url = tab.url
        changes.title = tab.title
      }
      if (properties.muted != null) {
        tab.mutedInfo = { muted: properties.muted }
        changes.mutedInfo = clone(tab.mutedInfo)
      }
      if (properties.highlighted != null) {
        tab.highlighted = properties.highlighted
        changes.highlighted = tab.highlighted
      }
      if (properties.active) activate(tab)
      if (Object.keys(changes).length)
        browser.tabs.onUpdated.emit(tab.id, changes, tab)
      removeEmptyGroups()
      if (properties.pinned != null)
        record(`${tab.pinned ? 'Pinned' : 'Unpinned'} “${tab.title}”.`)
      else if (properties.active)
        record(`Activated “${tab.title}” in window ${tab.windowId}.`)
      else notify()
      return clone(tab)
    },
    move: async (
      ids: number | number[],
      properties: { windowId?: number; index: number },
    ) => {
      const selected = tabIds(ids).map(requireTab)
      if (!selected.length) return []
      const destination =
        properties.windowId != null
          ? requireWindow(properties.windowId)
          : requireWindow(selected[0].windowId)
      let index = properties.index
      const moved = selected.map((tab) => {
        const result = moveOne(tab, destination, index)
        if (index !== -1) index = result.index + 1
        return clone(result)
      })
      record(
        `Moved ${moved.length === 1 ? 'a tab' : `${moved.length} tabs`} in window ${destination.id}.`,
      )
      return Array.isArray(ids) ? moved : moved[0]
    },
    remove: async (ids: number | number[]) => {
      const selected = tabIds(ids).map(requireTab)
      selected.forEach((tab) => {
        const win = requireWindow(tab.windowId)
        const index = win.tabs.indexOf(tab)
        win.tabs.splice(index, 1)
        reindex(win)
        const historyIndex = tabHistory.findIndex(
          (entry) => entry.tabId === tab.id,
        )
        if (historyIndex >= 0) tabHistory.splice(historyIndex, 1)
        browser.tabs.onRemoved.emit(tab.id, {
          windowId: win.id,
          isWindowClosing: !win.tabs.length,
        })
        ensureActiveTab(win, index)
        removeEmptyWindow(win)
      })
      localData.tabHistory = clone(tabHistory)
      removeEmptyGroups()
      record(
        `Closed ${selected.length === 1 ? 'a sample tab' : `${selected.length} sample tabs`}.`,
      )
    },
    reload: async (id: number) => {
      const tab = requireTab(id)
      tab.discarded = false
      tab.status = 'complete'
      browser.tabs.onUpdated.emit(
        id,
        { status: 'complete', discarded: false },
        tab,
      )
      record(`Simulated reloading “${tab.title}”.`)
    },
    group: async (properties: {
      tabIds: number | number[]
      groupId?: number
      createProperties?: { windowId?: number }
    }) => {
      const selected = tabIds(properties.tabIds).map(requireTab)
      if (!selected.length)
        throw new Error('Select at least one sample tab to group')
      const group =
        properties.groupId != null
          ? requireGroup(properties.groupId)
          : {
              id: nextGroupId++,
              windowId:
                properties.createProperties?.windowId ?? selected[0].windowId,
              title: '',
              color: 'grey',
              collapsed: false,
            }
      const win = requireWindow(group.windowId)
      if (selected.some((tab) => tab.windowId !== win.id)) {
        throw new Error(
          'Move sample tabs into the same window before grouping them',
        )
      }
      const isNewGroup = !groups.has(group.id)
      if (isNewGroup) groups.set(group.id, group)
      selected.forEach((tab) => {
        if (tab.pinned) {
          tab.pinned = false
          browser.tabs.onUpdated.emit(tab.id, { pinned: false }, tab)
        }
        updateGroupId(tab, group.id)
      })
      const members = win.tabs.filter((tab) => tab.groupId === group.id)
      const remaining = win.tabs.filter((tab) => tab.groupId !== group.id)
      const firstIndex = Math.min(...members.map((tab) => tab.index))
      const before = win.tabs
        .slice(0, firstIndex)
        .filter((tab) => tab.groupId !== group.id).length
      const pinnedCount = remaining.filter((tab) => tab.pinned).length
      const insertion = avoidSplittingGroup(
        remaining,
        Math.max(before, pinnedCount),
      )
      remaining.splice(insertion, 0, ...members)
      reorder(win, remaining)
      removeEmptyGroups()
      if (isNewGroup) browser.tabGroups.onCreated.emit(group)
      else browser.tabGroups.onUpdated.emit(group)
      record(
        `${isNewGroup ? 'Created a group with' : 'Grouped'} ${selected.length} sample ${selected.length === 1 ? 'tab' : 'tabs'}.`,
      )
      return group.id
    },
    ungroup: async (ids: number | number[]) => {
      const selected = tabIds(ids).map(requireTab)
      const affectedGroups = new Set(
        selected.map((tab) => tab.groupId).filter((id) => id !== -1),
      )
      selected.forEach((tab) => updateGroupId(tab, -1))
      // Move removed members just after remaining members to keep native group
      // rows contiguous, including removal from the middle of a group.
      affectedGroups.forEach((id) => {
        const group = groups.get(id)
        if (!group) return
        const win = requireWindow(group.windowId)
        const members = win.tabs.filter((tab) => tab.groupId === id)
        if (!members.length) return
        const removed = selected.filter(
          (tab) => tab.windowId === win.id && !tab.pinned,
        )
        const idsToMove = new Set(removed.map((tab) => tab.id))
        const ordered = win.tabs.filter((tab) => !idsToMove.has(tab.id))
        const end =
          ordered.findIndex(
            (tab) => tab.id === members[members.length - 1].id,
          ) + 1
        ordered.splice(end, 0, ...removed)
        reorder(win, ordered)
      })
      removeEmptyGroups()
      record(
        `Removed ${selected.length} sample ${selected.length === 1 ? 'tab' : 'tabs'} from groups.`,
      )
    },
  },
  windows: {
    WINDOW_ID_NONE: -1,
    WINDOW_ID_CURRENT: -2,
    onCreated: new DemoEvent(),
    onRemoved: new DemoEvent(),
    onFocusChanged: new DemoEvent(),
    getAll: async (
      options: { populate?: boolean; windowTypes?: string[] } = {},
    ) =>
      windows
        .filter(
          (win) =>
            !options.windowTypes || options.windowTypes.includes(win.type),
        )
        .map((win) => getWindowResult(win, options.populate)),
    get: async (id: number, options: { populate?: boolean } = {}) =>
      getWindowResult(
        requireWindow(id === -2 ? (currentWindowId ?? -1) : id),
        options.populate,
      ),
    getCurrent: async (options: { populate?: boolean } = {}) =>
      getWindowResult(requireWindow(currentWindowId ?? -1), options.populate),
    getLastFocused: async (options: { populate?: boolean } = {}) =>
      getWindowResult(requireWindow(currentWindowId ?? -1), options.populate),
    create: async (
      properties: {
        tabId?: number
        url?: string | string[]
        focused?: boolean
        type?: 'normal' | 'popup'
        width?: number
        height?: number
        left?: number
        top?: number
      } = {},
    ) => {
      const urls =
        properties.url == null
          ? []
          : Array.isArray(properties.url)
            ? properties.url
            : [properties.url]
      if (urls.some(isDemoURL)) {
        record('The Tab Manager workspace is already visible in this demo.')
        return undefined
      }
      urls.forEach(validateURL)
      const selected =
        properties.tabId != null ? requireTab(properties.tabId) : null
      const win = createEmptyWindow({ ...properties })
      if (selected) moveOne(selected, win, -1)
      for (const url of urls)
        await browser.tabs.create({ windowId: win.id, url, active: false })
      if (!win.tabs.length) await browser.tabs.create({ windowId: win.id })
      if (properties.focused !== false) focusWindow(win)
      record(`Created sample window ${win.id}.`)
      return clone(win)
    },
    update: async (
      id: number,
      properties: {
        focused?: boolean
        state?: DemoWindow['state']
        width?: number
        height?: number
        left?: number
        top?: number
      },
    ) => {
      const win = requireWindow(id)
      for (const key of ['state', 'width', 'height', 'left', 'top'] as const) {
        if (properties[key] != null)
          Object.assign(win, { [key]: properties[key] })
      }
      if (properties.focused) focusWindow(win)
      if (properties.focused) record(`Focused sample window ${win.id}.`)
      else notify()
      return getWindowResult(win)
    },
    remove: async (id: number) => {
      const win = requireWindow(id)
      const ids = win.tabs.map((tab) => tab.id)
      win.tabs = []
      ids.forEach((tabId) => {
        const historyIndex = tabHistory.findIndex(
          (entry) => entry.tabId === tabId,
        )
        if (historyIndex >= 0) tabHistory.splice(historyIndex, 1)
        browser.tabs.onRemoved.emit(tabId, {
          windowId: id,
          isWindowClosing: true,
        })
      })
      localData.tabHistory = clone(tabHistory)
      removeEmptyWindow(win)
      removeEmptyGroups()
      record(`Closed sample window ${id}.`)
    },
  },
  tabGroups: {
    TAB_GROUP_ID_NONE: -1,
    onCreated: new DemoEvent(),
    onRemoved: new DemoEvent(),
    onMoved: new DemoEvent(),
    onUpdated: new DemoEvent(),
    query: async (
      query: {
        windowId?: number
        collapsed?: boolean
        color?: string
        title?: string
      } = {},
    ) =>
      clone(
        Array.from(groups.values()).filter((group) =>
          Object.entries(query).every(
            ([key, value]) =>
              value == null ||
              (key === 'title'
                ? matchesPattern(group.title, String(value))
                : group[key as keyof DemoGroup] === value),
          ),
        ),
      ),
    get: async (id: number) => clone(requireGroup(id)),
    update: async (
      id: number,
      properties: { title?: string; color?: string; collapsed?: boolean },
    ) => {
      const group = requireGroup(id)
      const colors = [
        'grey',
        'blue',
        'red',
        'yellow',
        'green',
        'pink',
        'purple',
        'cyan',
        'orange',
      ]
      if (properties.color != null && !colors.includes(properties.color))
        throw new Error('Unsupported demo group color')
      if (properties.title != null) group.title = properties.title
      if (properties.color != null) group.color = properties.color
      if (properties.collapsed != null) group.collapsed = properties.collapsed
      browser.tabGroups.onUpdated.emit(group)
      record(
        properties.title != null
          ? `Renamed a group to “${group.title || 'Unnamed group'}”.`
          : properties.collapsed != null
            ? `${group.collapsed ? 'Collapsed' : 'Expanded'} “${group.title || 'Unnamed group'}”.`
            : `Changed the color of “${group.title || 'Unnamed group'}”.`,
      )
      return clone(group)
    },
    move: async (
      id: number,
      properties: { windowId?: number; index: number },
    ) => {
      const group = requireGroup(id)
      const source = requireWindow(group.windowId)
      const destination =
        properties.windowId != null
          ? requireWindow(properties.windowId)
          : source
      const selected = source.tabs.filter((tab) => tab.groupId === id)
      const remaining = destination.tabs.filter((tab) => tab.groupId !== id)
      const index = avoidSplittingGroup(
        remaining,
        clampIndex(remaining, selected[0], properties.index),
      )
      if (source === destination) {
        remaining.splice(index, 0, ...selected)
        reorder(source, remaining)
      } else {
        let cursor = index
        selected.forEach((tab) => {
          moveOne(tab, destination, cursor, true)
          cursor = tab.index + 1
        })
        group.windowId = destination.id
      }
      browser.tabGroups.onMoved.emit(group)
      record(
        `Moved “${group.title || 'Unnamed group'}” to window ${destination.id}.`,
      )
      return clone(group)
    },
  },
  history: {
    search: async (query: {
      text: string
      startTime?: number
      endTime?: number
      maxResults?: number
    }): Promise<DemoHistoryItem[]> => {
      const terms = query.text.toLowerCase().trim().split(/\s+/).filter(Boolean)
      return clone(
        history
          .filter((item) => {
            if (query.startTime != null && item.lastVisitTime < query.startTime)
              return false
            if (query.endTime != null && item.lastVisitTime > query.endTime)
              return false
            const content = `${item.title} ${item.url}`.toLowerCase()
            return terms.every((term) => content.includes(term))
          })
          .sort((a, b) => b.lastVisitTime - a.lastVisitTime)
          .slice(0, query.maxResults ?? 100),
      )
    },
  },
  management: {
    get: async () => ({ icons: [] as Array<{ size: number; url: string }> }),
  },
  runtime: {
    id: 'tab-manager-v2-memory-demo',
    getManifest: () => ({ version: 'demo', name: 'Tab Manager v2 Demo' }),
    getURL: (path: string) =>
      path === 'popup.html' ? demoPageURL() : new URL(path, demoPageURL()).href,
    onMessage: new DemoEvent(),
    onInstalled: new DemoEvent(),
    sendMessage: async (request: {
      action?: string
      tabs?: Array<{ id: number; pinned?: boolean }>
    }) => {
      if (request.action === 'CREATE-WINDOW') {
        if (!request.tabs?.length) return
        request.tabs.forEach((tab) => requireTab(tab.id))
        // Use the real extension's orchestration for whole-group preservation
        // and pinned transfers; require only when invoked to avoid the
        // browser/libs import cycle and keep the existing ES6 module target.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createWindow }: typeof import('../libs') = require('../libs')
        await createWindow(request.tabs)
        return
      }
      if (request.action === 'LAST-ACTIVE-TAB') {
        const liveHistory = tabHistory.filter((entry) =>
          windows.some((win) => win.tabs.some((tab) => tab.id === entry.tabId)),
        )
        const previous = liveHistory[Math.max(0, liveHistory.length - 2)]
        if (previous) {
          const tab = requireTab(previous.tabId)
          activate(tab)
          focusWindow(requireWindow(tab.windowId))
          record(`Returned to “${tab.title}”.`)
        }
        return
      }
      if (
        request.action === 'OPEN-IN-NEW-TAB' ||
        request.action === 'TOGGLE-POPUP'
      ) {
        record(
          'Tab Manager is already open. This demo stays in the current page.',
        )
        return
      }
      throw new Error(`Unsupported demo action: ${request.action ?? 'unknown'}`)
    },
  },
  commands: {
    onCommand: new DemoEvent(),
    getAll: async (): Promise<
      Array<{ name: string; description: string; shortcut: string }>
    > => [],
  },
}

const createEmptyWindow = (properties: Partial<DemoWindow> = {}) => {
  const win = {
    ...createDemoWindow(nextWindowId++),
    ...properties,
    tabs: [],
  } as DemoWindow
  windows.push(win)
  browser.windows.onCreated.emit(win)
  if (currentWindowId == null) focusWindow(win)
  return win
}

const matchesPattern = (value: string, pattern: string) => {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`).test(value)
}

export const addDemoTab = async () => {
  const index = nextTabId - 1
  const sample = createSampleTab(
    nextTabId,
    currentWindowId ?? nextWindowId,
    0,
    index,
  )
  const created = await browser.tabs.create({
    url: sample.url,
    title: sample.title,
    active: true,
  })
  if (created) {
    const tab = requireTab(created.id)
    tab.favIconUrl = sample.favIconUrl
    browser.tabs.onUpdated.emit(tab.id, { favIconUrl: tab.favIconUrl }, tab)
    return clone(tab)
  }
  return undefined
}

export default browser
