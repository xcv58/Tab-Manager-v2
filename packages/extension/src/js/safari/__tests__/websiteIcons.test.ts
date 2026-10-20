import { createWebsiteIcons } from '../websiteIcons'

const page = 'https://example.com/article'
const icon = 'https://example.com/favicon.ico'
const png = 'data:image/png;base64,bG9jYWw='
const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}
const response = (
  type = 'image/png',
  bytes = new Uint8Array([1, 2, 3]),
  length = '',
) => {
  const reader = {
    read: jest
      .fn()
      .mockResolvedValueOnce({ done: false, value: bytes })
      .mockResolvedValue({ done: true }),
    cancel: jest.fn().mockResolvedValue(undefined),
  }
  return {
    ok: true,
    headers: {
      get: (name: string) =>
        name === 'content-type'
          ? type
          : name === 'content-length'
            ? length
            : null,
    },
    body: {
      getReader: jest.fn(() => reader),
      cancel: jest.fn().mockResolvedValue(undefined),
    },
    reader,
  }
}
const fixture = () => {
  const events: Record<string, (...args: any[]) => void> = {}
  const event = (key: string) => ({
    addListener: (fn: (...args: any[]) => void) => {
      events[key] = fn
    },
  })
  const tab = { id: 1, url: page, incognito: false }
  const preferences = { loadWebsiteIcons: true, showTabIcon: true }
  const raw = {
    permissions: {
      contains: jest.fn().mockResolvedValue(true),
      request: jest.fn().mockResolvedValue(true),
      onAdded: event('added'),
      onRemoved: event('removed'),
    },
    storage: {
      local: { get: jest.fn(async () => preferences) },
      onChanged: event('storage'),
    },
    tabs: {
      get: jest.fn(async (id: number) => ({ ...tab, id })),
      executeScript: jest.fn(async () => [{ url: page, icons: [icon] }]),
      onUpdated: event('updated'),
    },
  }
  return { raw, tab, preferences, events, api: createWebsiteIcons(raw) }
}

const originalImage = globalThis.Image
const originalFetch = globalThis.fetch
const originalCreate = URL.createObjectURL
const originalRevoke = URL.revokeObjectURL
beforeEach(() => {
  globalThis.fetch = jest.fn().mockImplementation(async () => response())
  URL.createObjectURL = jest.fn(() => 'blob:local-icon')
  URL.revokeObjectURL = jest.fn()
  globalThis.Image = class {
    naturalWidth = 32
    naturalHeight = 32
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(value: string) {
      if (value.startsWith('blob:'))
        Promise.resolve().then(() => this.onload?.())
    }
  } as any
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({ drawImage: jest.fn() } as any)
  jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(png)
})
afterEach(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
  globalThis.Image = originalImage
  globalThis.fetch = originalFetch
  URL.createObjectURL = originalCreate
  URL.revokeObjectURL = originalRevoke
})

it.each(['disabled', 'hidden', 'denied', 'private', 'stale'])(
  'does not inspect the page or make a network request when %s',
  async (reason) => {
    const f = fixture()
    if (reason === 'disabled') f.preferences.loadWebsiteIcons = false
    if (reason === 'hidden') f.preferences.showTabIcon = false
    if (reason === 'denied') f.raw.permissions.contains.mockResolvedValue(false)
    if (reason === 'private') f.tab.incognito = true
    if (reason === 'stale') f.tab.url = 'https://example.com/different'
    expect(await f.api.resolve(1, page)).toBeNull()
    expect(f.raw.tabs.executeScript).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  },
)

it('requests only deduplicated HTTP origins without credentials or paths', async () => {
  const { api, raw } = fixture()
  await api.requestAccess([
    page,
    page + '?q=private',
    'http://127.0.0.1:8831/notes',
    'http://127.0.0.1:8832/other',
    'file:///private',
    'https://user:password@example.com/',
    'safari-web-extension://manager/',
  ])
  expect(raw.permissions.request).toHaveBeenCalledWith({
    origins: ['https://example.com/*', 'http://127.0.0.1/*'],
  })
})

it('uses a top-frame packaged reader and never sends cookies or referrers or follows redirects', async () => {
  const { api, raw } = fixture()
  expect(await api.resolve(1, page)).toBe(png)
  expect(raw.tabs.executeScript).toHaveBeenCalledWith(1, {
    file: 'read-icon.js',
    runAt: 'document_idle',
    allFrames: false,
  })
  expect(fetch).toHaveBeenCalledWith(
    icon,
    expect.objectContaining({
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'error',
    }),
  )
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-icon')
})

it('does not fetch cross-origin, cross-port, or executable icon links', async () => {
  const { api, raw } = fixture()
  raw.tabs.executeScript.mockResolvedValue([
    {
      url: page,
      icons: [
        'https://other.example/icon.png',
        'https://example.com:8443/icon.png',
        'javascript:alert(1)',
        'data:image/png;base64,AAAA',
      ],
    },
  ])
  expect(await api.resolve(1, page)).toBe(png)
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith(icon, expect.anything())
})

it.each(['metadata', 'navigation', 'revoked'])(
  'rejects a result when its %s changes during loading',
  async (reason) => {
    const { api, raw, tab } = fixture()
    if (reason === 'metadata')
      raw.tabs.executeScript.mockResolvedValue([
        { url: page + '#other', icons: [icon] },
      ])
    else
      (fetch as jest.Mock).mockImplementation(async () => {
        if (reason === 'navigation') tab.url = page + '?different'
        else raw.permissions.contains.mockResolvedValue(false)
        return response()
      })
    expect(await api.resolve(1, page)).toBeNull()
  },
)

it.each(['svg', 'declared-oversize', 'streamed-oversize'])(
  'falls back on %s icon data and closes the response body',
  async (reason) => {
    const r = response(
      reason === 'svg' ? 'image/svg+xml' : 'image/png',
      new Uint8Array(reason === 'streamed-oversize' ? 262145 : 3),
      reason === 'declared-oversize' ? '262145' : '',
    )
    ;(fetch as jest.Mock).mockResolvedValue(r)
    expect(await fixture().api.resolve(1, page)).toBeNull()
    expect(
      r.body.cancel.mock.calls.length + r.reader.cancel.mock.calls.length,
    ).toBeGreaterThan(0)
  },
)

it('deduplicates in-flight work and rechecks permission and private status before using its memory cache', async () => {
  const f = fixture()
  await Promise.all([f.api.resolve(1, page), f.api.resolve(1, page)])
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(await f.api.resolve(1, page)).toBe(png)
  expect(fetch).toHaveBeenCalledTimes(1)
  f.tab.incognito = true
  expect(await f.api.resolve(1, page)).toBeNull()
  f.tab.incognito = false
  f.raw.permissions.contains.mockResolvedValue(false)
  expect(await f.api.resolve(1, page)).toBeNull()
  expect(fetch).toHaveBeenCalledTimes(1)
})

it.each(['disabled', 'revoked'])(
  'aborts pending icon work when access is %s and notifies subscribed UI',
  async (reason) => {
    const f = fixture()
    let signal: AbortSignal
    ;(fetch as jest.Mock).mockImplementation((_url, options) => {
      signal = options.signal
      return new Promise(() => {})
    })
    const listener = jest.fn()
    const unsubscribe = f.api.subscribe(listener)
    const task = f.api.resolve(1, page)
    await flush()
    expect(fetch).toHaveBeenCalledTimes(1)
    if (reason === 'disabled') {
      f.preferences.loadWebsiteIcons = false
      f.events.storage({ loadWebsiteIcons: { newValue: false } }, 'local')
    } else f.events.removed()
    expect(await task).toBeNull()
    expect(signal!.aborted).toBe(true)
    expect(listener).toHaveBeenCalled()
    unsubscribe()
    listener.mockClear()
    f.events.removed()
    expect(listener).not.toHaveBeenCalled()
  },
)

it('bounds an unresponsive Safari read without inspecting a page or fetching', async () => {
  jest.useFakeTimers()
  const f = fixture()
  f.raw.tabs.get.mockReturnValue(new Promise(() => {}))
  const task = f.api.resolve(1, page)
  await jest.advanceTimersByTimeAsync(8001)
  expect(await task).toBeNull()
  expect(f.raw.tabs.executeScript).not.toHaveBeenCalled()
  expect(fetch).not.toHaveBeenCalled()
})

it('limits concurrent icon requests while allowing queued visible tabs to finish', async () => {
  const f = fixture()
  const url = (id: number) => `${page}?tab=${id}`
  f.raw.tabs.get.mockImplementation(async (id) => ({
    ...f.tab,
    id,
    url: url(id),
  }))
  f.raw.tabs.executeScript.mockImplementation(async (id) => [
    { url: url(id), icons: [icon] },
  ])
  const completions: ((value: any) => void)[] = []
  ;(fetch as jest.Mock).mockImplementation(
    () => new Promise((resolve) => completions.push(resolve)),
  )
  const tasks = Array.from({ length: 5 }, (_, i) =>
    f.api.resolve(i + 1, url(i + 1)),
  )
  await flush()
  expect(fetch).toHaveBeenCalledTimes(4)
  completions[0](response())
  await tasks[0]
  await flush()
  expect(fetch).toHaveBeenCalledTimes(5)
  completions.slice(1).forEach((complete) => complete(response()))
  expect(await Promise.all(tasks)).toEqual([png, png, png, png, png])
})
