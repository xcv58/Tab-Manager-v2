import { safariState } from './state'

// This adapter is packaged only for Safari. It reads actual Safari APIs; it is
// deliberately separate from the website's fictional, in-memory adapter.
const raw = (globalThis as any).browser
if (!raw?.runtime || !raw?.tabs)
  throw new Error('Open Tab Manager from the Safari extension icon.')
const noEvent = {
  addListener() {},
  removeListener() {},
  hasListener: () => false,
}

const readable = async <T>(
  operation: () => Promise<T>,
  reportError = true,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                'Safari did not respond. Refresh the view and try again.',
              ),
            ),
          5000,
        )
      }),
    ])
  } catch (error) {
    if (reportError) safariState.showError(error)
    throw error
  } finally {
    clearTimeout(timer!)
  }
}

const normalizeTab = (tab: any) => {
  if (!tab || tab.incognito)
    throw new Error('This tab is unavailable in this Safari profile.')
  const normalized = {
    ...tab,
    groupId: -1,
    url: tab.url || '',
    title: tab.title || 'Untitled tab',
  }
  return normalized
}

const normalWindows = (windows: any[]) => {
  const normal = windows.filter((win) => !win.incognito)
  const owners = new Map<number, { windowId: number; rank: number }>()
  for (const win of normal)
    for (const tab of win.tabs || []) {
      if (tab.incognito) continue
      const rank = (tab.windowId === win.id ? 2 : 0) + (win.focused ? 1 : 0)
      if (!owners.has(tab.id) || rank > owners.get(tab.id)!.rank)
        owners.set(tab.id, { windowId: win.id, rank })
    }
  return normal.map((win) => ({
    ...win,
    type: win.type || 'normal',
    tabs: (win.tabs || [])
      .filter(
        (tab: any) => !tab.incognito && owners.get(tab.id)?.windowId === win.id,
      )
      .map(normalizeTab),
  }))
}

// Mutations use the standard browser API directly. Do not time out or replay a
// mutation: Safari owns the request once it has been submitted.
const mutate = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    safariState.showError(error)
    throw error
  }
}

const normalTab = async (id: number) => {
  const tab: any = await readable(() => raw.tabs.get(id))
  if (tab?.id !== id)
    throw new Error('This tab is unavailable. Refresh the view.')
  return normalizeTab(tab)
}

const normalWindow = async (id: number) => {
  const win: any = await readable(() => raw.windows.get(id))
  if (win?.id !== id || win.incognito)
    throw new Error('This window is unavailable in this Safari profile.')
  return win
}

// Activation events omit incognito information. Check their window before
// exposing them to stores, without showing errors for excluded or closed windows.
const normalWindowEvent = async (windowId: number, args: any[]) => {
  try {
    const win: any = await readable(() => raw.windows.get(windowId), false)
    return win?.id === windowId && !win.incognito ? args : null
  } catch {
    return null
  }
}

const event = (
  source: any,
  transform: (...args: any[]) => any[] | null | Promise<any[] | null>,
) => {
  if (!source) return noEvent
  const listeners = new Map<
    (...args: any[]) => void,
    (...args: any[]) => void
  >()
  return {
    addListener(callback: (...args: any[]) => void) {
      if (listeners.has(callback)) return
      let pending = Promise.resolve()
      const wrapped = (...args: any[]) => {
        const next = transform(...args)
        const deliver = (values: any[] | null) => {
          if (values && listeners.get(callback) === wrapped)
            return callback(...values)
        }
        if (next instanceof Promise) {
          // Start reads immediately, but preserve source event order if Safari
          // replies out of order. Unsubscribed listeners receive no late events.
          const dispatch = pending.then(() => next).then(deliver)
          pending = dispatch.then(
            () => {},
            () => {},
          )
          return dispatch
        }
        return deliver(next)
      }
      listeners.set(callback, wrapped)
      source.addListener(wrapped)
    },
    removeListener(callback: (...args: any[]) => void) {
      const wrapped = listeners.get(callback)
      if (wrapped) source.removeListener(wrapped)
      listeners.delete(callback)
    },
    hasListener: (callback: (...args: any[]) => void) =>
      listeners.has(callback),
  }
}

const tabs = {
  create: (options: any) => mutate(() => raw.tabs.create(options)),
  get: normalTab,
  query: async (options: any = {}) =>
    (await readable<any[]>(() => raw.tabs.query(options)))
      .filter((tab) => !tab.incognito)
      .map(normalizeTab),
  update: (id: number, properties: Record<string, boolean>) =>
    mutate(async () => {
      if (
        !properties ||
        !Object.keys(properties).length ||
        Object.entries(properties).some(
          ([key, value]) =>
            !['active', 'pinned'].includes(key) || typeof value !== 'boolean',
        )
      )
        throw new Error('This tab action is unavailable in Safari.')
      const tab = await normalTab(id)
      return normalizeTab(await raw.tabs.update(tab.id, properties))
    }),
  reload: (id: number) =>
    mutate(async () => {
      const tab = await normalTab(id)
      return raw.tabs.reload(tab.id)
    }),
  remove: (ids: number | number[]) =>
    mutate(async () => {
      const unique = [...new Set(Array.isArray(ids) ? ids : [ids])]
      if (!unique.length) return
      // Validate private/profile access without requiring title or URL access.
      await Promise.all(unique.map(normalTab))
      safariState.startRemovingTabs(unique)
      try {
        return await raw.tabs.remove(unique)
      } finally {
        safariState.finishRemovingTabs(unique)
      }
    }),
  move: async () => {
    throw new Error('Moving tabs is unavailable in Safari.')
  },
  onActivated: event(raw.tabs.onActivated, (info) =>
    normalWindowEvent(info.windowId, [info]),
  ),
  onCreated: event(raw.tabs.onCreated, (tab) =>
    tab.incognito ? null : [normalizeTab(tab)],
  ),
  onUpdated: event(raw.tabs.onUpdated, (id, changes, tab) =>
    tab?.incognito ? null : [id, changes, tab ? normalizeTab(tab) : tab],
  ),
  onRemoved: raw.tabs.onRemoved || noEvent,
  onReplaced: raw.tabs.onReplaced || noEvent,
  onAttached: raw.tabs.onAttached || noEvent,
  onDetached: raw.tabs.onDetached || noEvent,
  onMoved: raw.tabs.onMoved || noEvent,
}
const windows = {
  onCreated: event(raw.windows.onCreated, (win) =>
    win.incognito ? null : [win],
  ),
  onRemoved: raw.windows.onRemoved || noEvent,
  onFocusChanged: event(raw.windows.onFocusChanged, async (windowId) =>
    windowId <= 0 ? [windowId] : normalWindowEvent(windowId, [windowId]),
  ),
  getAll: async (options: any = {}) =>
    normalWindows(
      await readable<any[]>(() =>
        raw.windows.getAll({ populate: !!options.populate }),
      ),
    ),
  get: async (id: number, options: any = {}) => {
    const win: any = await readable(() => raw.windows.get(id, options))
    if (win.incognito) throw new Error('Private windows are excluded.')
    return normalWindows([win])[0]
  },
  getLastFocused: async (options: any = {}) => {
    const win: any = await readable(() => raw.windows.getLastFocused(options))
    if (win.incognito) throw new Error('Private windows are excluded.')
    return normalWindows([win])[0]
  },
  getCurrent: async (options: any = {}) => {
    const win: any = await readable(() => raw.windows.getCurrent(options))
    if (win.incognito) throw new Error('Private windows are excluded.')
    return normalWindows([win])[0]
  },
  update: (id: number, properties: any) =>
    mutate(async () => {
      if (
        !properties ||
        Object.keys(properties).some((key) => key !== 'focused') ||
        properties.focused !== true
      )
        throw new Error('Changing window layout is unavailable in Safari.')
      const win = await normalWindow(id)
      return raw.windows.update(win.id, properties)
    }),
  remove: (id: number) =>
    mutate(async () => {
      const win = await normalWindow(id)
      return raw.windows.remove(win.id)
    }),
  create: async () => {
    throw new Error('Moving tabs to new windows is unavailable in Safari.')
  },
}
const api = {
  runtime: raw.runtime,
  commands: raw.commands,
  browserAction: raw.browserAction,
  action: raw.action,
  tabs,
  windows,
  history: undefined as undefined,
  management: undefined as undefined,
  tabGroups: undefined as undefined,
  contextualIdentities: undefined as undefined,
  storage: {
    local: raw.storage.local,
    sync: raw.storage.local,
    onChanged: raw.storage.onChanged,
  },
}
export default api
