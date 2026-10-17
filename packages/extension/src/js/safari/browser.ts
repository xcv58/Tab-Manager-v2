import { safariState, type SafariActionProgress } from './state'

// This adapter is packaged only for Safari. It reads actual Safari APIs; it is
// deliberately separate from the website's fictional, in-memory adapter.
const raw = (globalThis as any).browser
if (!raw?.runtime || !raw?.tabs)
  throw new Error('Open Tab Manager from the Safari extension icon.')
const seenTabs = new Map<number, any>()
let backgroundContext = false
let uiMutationPending = false
let actionTail: Promise<unknown> = Promise.resolve()
type ActionJob = SafariActionProgress & {
  value?: unknown
  cancelRequested?: boolean
}
const jobs = new Map<string, ActionJob>()
const queuedLifetime = 30000
const noEvent = {
  addListener() {},
  removeListener() {},
  hasListener: () => false,
}

const readable = async <T>(operation: () => Promise<T>): Promise<T> => {
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
    safariState.showError(error)
    throw error
  } finally {
    clearTimeout(timer!)
  }
}

const remember = (tab: any) => {
  if (!tab || tab.incognito)
    throw new Error('This tab is unavailable in this Safari profile.')
  const normalized = {
    ...tab,
    groupId: -1,
    url: tab.url || '',
    title: tab.title || 'Untitled tab',
  }
  seenTabs.set(tab.id, normalized)
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
      .map(remember),
  }))
}

const checked = async (target: any, requireURL: boolean) => {
  const tab: any = await readable(() => raw.tabs.get(target.id))
  if (
    tab.incognito ||
    tab.windowId !== target.windowId ||
    (tab.url || '') !== (target.url || '')
  ) {
    throw new Error(
      'A selected tab changed. Refresh the view and review your selection.',
    )
  }
  if (requireURL && !tab.url)
    throw new Error(
      'Safari has not shared this tab’s URL. Allow website access in Safari, then refresh before changing it.',
    )
  return tab
}

const checkWindow = async (target: any) => {
  const win: any = await readable(() =>
    raw.windows.get(target.id, { populate: true }),
  )
  if (win.incognito || win.id !== target.id || win.type !== target.type)
    throw new Error('This window changed. Refresh before closing it.')
  const before = new Map(target.tabs.map((tab: any) => [tab.id, tab.url || '']))
  const now = new Map(
    (win.tabs || []).map((tab: any) => [tab.id, tab.url || '']),
  )
  if (
    before.size !== now.size ||
    [...before].some(([id, url]) => now.get(id) !== url)
  )
    throw new Error(
      'The tabs in this window changed. Review the window before closing it.',
    )
  return win
}

const runAction = (request: any) => {
  if (typeof request.id !== 'string' || !request.id)
    throw new Error('This action is invalid.')
  if (jobs.has(request.id)) return jobs.get(request.id)!
  const targets: any[] = Array.isArray(request.targets)
    ? [...new Map(request.targets.map((tab: any) => [tab.id, tab])).values()]
    : []
  const windowClose = request.action === 'close-window'
  const job: ActionJob = {
    id: request.id,
    action: request.action,
    state: 'queued',
    completed: 0,
    total: windowClose ? 1 : targets.length,
  }
  jobs.set(job.id, job)
  // Retain active operations and recent results, never replay a timed-out call.
  for (const [id, previous] of jobs) {
    if (jobs.size <= 100) break
    if (['done', 'failed', 'cancelled'].includes(previous.state))
      jobs.delete(id)
  }
  const operation = actionTail
    .then(async () => {
      if (
        !Number.isFinite(request.requestedAt) ||
        Math.abs(Date.now() - request.requestedAt) > queuedLifetime
      )
        throw new Error(
          'This action expired. Refresh and review your selection.',
        )
      if (
        !['close', 'close-window', 'reload', 'update', 'focus'].includes(
          request.action,
        )
      )
        throw new Error('This action is unavailable in Safari.')
      if (
        !windowClose &&
        (!targets.length || targets.some((tab) => !Number.isInteger(tab.id)))
      )
        throw new Error('Choose at least one available tab.')
      if (
        request.action === 'update' &&
        targets.some((target) => {
          const properties = target.properties
          return (
            !properties ||
            !Object.keys(properties).length ||
            Object.entries(properties).some(
              ([key, value]) =>
                !['active', 'pinned'].includes(key) ||
                typeof value !== 'boolean',
            )
          )
        })
      )
        throw new Error('This tab action is unavailable in Safari.')
      if (job.cancelRequested) {
        job.state = 'cancelled'
        return
      }
      job.state = 'running'
      if (windowClose) {
        const win = await checkWindow(request.window)
        if (job.cancelRequested) {
          job.state = 'cancelled'
          return
        }
        await raw.windows.remove(win.id)
        job.completed = 1
        job.state = 'done'
        return
      }
      const requiresURL = (target: any) =>
        request.action !== 'focus' &&
        !(
          request.action === 'update' &&
          target.properties.active === true &&
          Object.keys(target.properties).length === 1
        )
      // Bound concurrent reads without imposing an arbitrary limit on selection size.
      for (let index = 0; index < targets.length; index += 50) {
        if (job.cancelRequested) {
          job.state = 'cancelled'
          return
        }
        await Promise.all(
          targets
            .slice(index, index + 50)
            .map((tab) => checked(tab, requiresURL(tab))),
        )
      }
      for (const target of targets) {
        if (job.cancelRequested) {
          job.state = 'cancelled'
          return
        }
        const current = await checked(target, requiresURL(target))
        if (job.cancelRequested) {
          job.state = 'cancelled'
          return
        }
        // Once started, large approved batches may run longer than the queue expiry.
        // Never release the queue until Safari's actual mutation has settled.
        if (request.action === 'close') await raw.tabs.remove(current.id)
        else if (request.action === 'reload') await raw.tabs.reload(current.id)
        else if (request.action === 'focus')
          job.value = await raw.windows.update(current.windowId, {
            focused: true,
          })
        else job.value = await raw.tabs.update(current.id, target.properties)
        job.completed++
        if (job.completed < job.total) {
          // Give Safari time to deliver UI/cancel messages between mutations,
          // instead of immediately submitting another browser-API request.
          await new Promise((resolve) => setTimeout(resolve, 25))
        }
      }
      job.state = 'done'
    })
    .catch((error) => {
      job.state = 'failed'
      job.error = windowClose
        ? error instanceof Error
          ? error.message
          : 'Could not close this window.'
        : `Safari completed ${job.completed} of ${job.total} tabs. ${error instanceof Error ? error.message : 'Refresh before retrying.'}`
    })
  actionTail = operation
  return job
}

const status = (id: string) => {
  const job = jobs.get(id)
  if (!job)
    throw new Error(
      'Safari no longer has this action. Refresh before retrying.',
    )
  return { ...job }
}

const waitForAction = async (id: string) => {
  try {
    while (true) {
      const job: ActionJob = backgroundContext
        ? status(id)
        : await readable(() =>
            raw.runtime.sendMessage({ kind: 'safari-action-status', id }),
          )
      if (!job?.state)
        throw new Error(
          'Safari could not report this action. Refresh before retrying.',
        )
      if (!backgroundContext) safariState.setProgress(job)
      if (job.state === 'done') return job.value
      if (job.state === 'failed') throw new Error(job.error)
      if (job.state === 'cancelled')
        throw new Error(
          `Stopped after ${job.completed} of ${job.total} tabs. Refresh before choosing another action.`,
        )
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  } finally {
    if (!backgroundContext && safariState.progress?.id === id)
      safariState.setProgress(null)
  }
}

export const installSafariActions = () => {
  backgroundContext = true
  raw.runtime.onMessage.addListener((request: any, sender: any) => {
    if (
      ![
        'safari-tab-action',
        'safari-action-status',
        'safari-action-cancel',
      ].includes(request?.kind)
    )
      return undefined
    if (
      sender.id !== raw.runtime.id ||
      (sender.url && !sender.url.startsWith(raw.runtime.getURL('')))
    )
      return Promise.resolve({
        ok: false,
        error: 'Open this action from Tab Manager.',
      })
    try {
      if (request.kind === 'safari-action-status')
        return Promise.resolve(status(request.id))
      if (request.kind === 'safari-action-cancel') {
        const job = jobs.get(request.id)
        if (job) job.cancelRequested = true
        return Promise.resolve({ ok: true })
      }
      const job = runAction(request)
      return Promise.resolve({ ok: true, id: job.id })
    } catch (error) {
      return Promise.resolve({
        ok: false,
        error:
          error instanceof Error ? error.message : 'Invalid Safari action.',
      })
    }
  })
}

const sendAction = async (request: any) => {
  if (backgroundContext) return waitForAction(runAction(request).id)
  const response = await readable<any>(() => raw.runtime.sendMessage(request))
  if (!response?.ok)
    throw new Error(
      response?.error ||
        'Safari did not accept this action. Refresh before retrying.',
    )
  return waitForAction(response.id)
}

const mutate = async (
  action: string,
  ids: number[],
  updates?: Map<number, Record<string, boolean>>,
) => {
  let ownsUI = false
  try {
    const unique = [...new Set(ids)]
    if (!unique.length) return undefined
    if (!backgroundContext && uiMutationPending)
      throw new Error(
        'Wait for the current Safari action to finish, or stop it first.',
      )
    const activationOnly =
      action === 'focus' ||
      (action === 'update' &&
        unique.every((id) => {
          const properties = updates?.get(id)
          return (
            properties?.active === true && Object.keys(properties).length === 1
          )
        }))
    if (!backgroundContext && !activationOnly) {
      uiMutationPending = true
      ownsUI = true
    }
    const targets = []
    for (const id of unique)
      targets.push(
        seenTabs.get(id) || remember(await readable(() => raw.tabs.get(id))),
      )
    if (
      action === 'close' &&
      !backgroundContext &&
      !(await safariState.confirmClose(unique))
    )
      return undefined
    if (action === 'close' && !backgroundContext)
      safariState.setRemovingTabs(unique)
    return await sendAction({
      kind: 'safari-tab-action',
      id: crypto.randomUUID(),
      requestedAt: Date.now(),
      action,
      targets: targets.map((tab) => ({
        id: tab.id,
        windowId: tab.windowId,
        url: tab.url,
        ...(action === 'update' ? { properties: updates?.get(tab.id) } : {}),
      })),
    })
  } catch (error) {
    safariState.showError(error)
    throw error
  } finally {
    if (ownsUI) {
      if (action === 'close') safariState.setRemovingTabs([])
      uiMutationPending = false
    }
  }
}

const event = (source: any, transform: (...args: any[]) => any[] | null) => {
  if (!source) return noEvent
  const listeners = new Map<
    (...args: any[]) => void,
    (...args: any[]) => void
  >()
  return {
    addListener(callback: (...args: any[]) => void) {
      if (listeners.has(callback)) return
      const wrapped = (...args: any[]) => {
        const next = transform(...args)
        if (next) callback(...next)
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
  create: (options: any) => readable(() => raw.tabs.create(options)),
  get: async (id: number) => remember(await readable(() => raw.tabs.get(id))),
  query: async (options: any = {}) =>
    (await readable<any[]>(() => raw.tabs.query(options)))
      .filter((tab) => !tab.incognito)
      .map(remember),
  update: (id: number, properties: Record<string, boolean>) =>
    mutate('update', [id], new Map([[id, properties]])),
  // Internal bulk helpers keep one approved operation, progress and cancellation.
  updateMany: (
    updates: Array<{ id: number; properties: Record<string, boolean> }>,
  ) =>
    mutate(
      'update',
      updates.map((tab) => tab.id),
      new Map(updates.map((tab) => [tab.id, tab.properties])),
    ),
  reload: (id: number) => mutate('reload', [id]),
  reloadMany: (ids: number[]) => mutate('reload', ids),
  remove: (ids: number | number[]) =>
    mutate('close', Array.isArray(ids) ? ids : [ids]),
  move: async () => {
    throw new Error('Moving tabs is unavailable in Safari.')
  },
  onActivated: raw.tabs.onActivated || noEvent,
  onCreated: event(raw.tabs.onCreated, (tab) =>
    tab.incognito ? null : [remember(tab)],
  ),
  onUpdated: event(raw.tabs.onUpdated, (id, changes, tab) =>
    tab?.incognito ? null : [id, changes, tab ? remember(tab) : tab],
  ),
  onRemoved: event(raw.tabs.onRemoved, (id, info) => {
    seenTabs.delete(id)
    return [id, info]
  }),
  onReplaced: raw.tabs.onReplaced || noEvent,
  onAttached: raw.tabs.onAttached || noEvent,
  onDetached: raw.tabs.onDetached || noEvent,
  onMoved: raw.tabs.onMoved || noEvent,
}
const windows = {
  onCreated: raw.windows.onCreated || noEvent,
  onRemoved: raw.windows.onRemoved || noEvent,
  onFocusChanged: raw.windows.onFocusChanged || noEvent,
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
  update: async (id: number, properties: any) => {
    if (
      Object.keys(properties).some((key) => key !== 'focused') ||
      properties.focused !== true
    )
      throw new Error('Changing window layout is unavailable in Safari.')
    const candidates = [...seenTabs.values()].filter(
      (tab) => tab.windowId === id,
    )
    const tab = candidates.find((tab) => tab.active) || candidates[0]
    if (!tab) throw new Error('This window is unavailable. Refresh the view.')
    return mutate('focus', [tab.id])
  },
  remove: async (id: number) => {
    let ownsUI = false
    try {
      if (!backgroundContext && uiMutationPending)
        throw new Error('Wait for the current Safari action to finish first.')
      if (!backgroundContext) {
        uiMutationPending = true
        ownsUI = true
      }
      const win: any = await readable(() =>
        raw.windows.get(id, { populate: true }),
      )
      if (win.incognito) throw new Error('Private windows are excluded.')
      const tabs = win.tabs || []
      if (
        !backgroundContext &&
        !(await safariState.confirmWindowClose(
          id,
          tabs.map((tab: any) => tab.id),
        ))
      )
        return undefined
      return await sendAction({
        kind: 'safari-tab-action',
        id: crypto.randomUUID(),
        requestedAt: Date.now(),
        action: 'close-window',
        window: {
          id,
          type: win.type,
          tabs: tabs.map((tab: any) => ({ id: tab.id, url: tab.url || '' })),
        },
      })
    } catch (error) {
      safariState.showError(error)
      throw error
    } finally {
      if (ownsUI) uiMutationPending = false
    }
  },
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
