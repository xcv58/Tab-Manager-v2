import { safariState } from '../state'

const listenerEvent = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
})
const raw = {
  runtime: { id: 'safari-test' },
  tabs: {
    get: jest.fn(),
    query: jest.fn(),
    update: jest.fn(),
    reload: jest.fn(),
    remove: jest.fn(),
    onCreated: listenerEvent(),
  },
  windows: {
    get: jest.fn(),
    getAll: jest.fn(),
    remove: jest.fn(),
  },
  storage: { local: {}, onChanged: listenerEvent() },
}

let api: typeof import('../browser').default

beforeAll(async () => {
  ;(globalThis as any).browser = raw
  api = (await import('../browser')).default
})
afterAll(() => delete (globalThis as any).browser)
beforeEach(() => {
  jest.clearAllMocks()
  safariState.dismissError()
  safariState.removingTabIDs.clear()
  raw.tabs.get.mockImplementation(async (id) => ({ id, windowId: 1 }))
  raw.tabs.remove.mockResolvedValue(undefined)
  raw.tabs.reload.mockResolvedValue(undefined)
})
afterEach(() => jest.useRealTimers())

it('closes more than 100 distinct tabs with one standard API request, without URL access', async () => {
  const ids = Array.from({ length: 150 }, (_, i) => i + 1)
  await api.tabs.remove([...ids, 1])
  expect(raw.tabs.get).toHaveBeenCalledTimes(150)
  expect(raw.tabs.remove).toHaveBeenCalledTimes(1)
  expect(raw.tabs.remove).toHaveBeenCalledWith(ids)
  expect(safariState.removingTabIDs.size).toBe(0)
})

it.each(['private', 'mismatched', 'missing'])(
  'rejects a batch containing a %s tab before closing any tabs',
  async (kind) => {
    raw.tabs.get.mockImplementation(async (id) =>
      id === 2
        ? kind === 'private'
          ? { id, incognito: true }
          : kind === 'mismatched'
            ? { id: 99 }
            : undefined
        : { id },
    )
    await expect(api.tabs.remove([1, 2])).rejects.toThrow()
    expect(raw.tabs.remove).not.toHaveBeenCalled()
    expect(safariState.error).not.toBe('')
  },
)

it('keeps overlapping close requests pending independently and never replays a failed request', async () => {
  const settle: ((value?: unknown) => void)[] = []
  raw.tabs.remove.mockImplementation(
    () => new Promise((resolve) => settle.push(resolve)),
  )
  const first = api.tabs.remove([1, 2])
  const second = api.tabs.remove([2, 3])
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(safariState.removingTabIDs.get(2)).toBe(2)
  settle[0]()
  await first
  expect(safariState.removingTabIDs.get(2)).toBe(1)
  settle[1]()
  await second
  expect(safariState.removingTabIDs.size).toBe(0)
  raw.tabs.remove.mockRejectedValueOnce(new Error('Safari refused'))
  await expect(api.tabs.remove(1)).rejects.toThrow('Safari refused')
  expect(raw.tabs.remove).toHaveBeenCalledTimes(3)
  expect(safariState.error).toBe('Safari refused')
  expect(safariState.removingTabIDs.size).toBe(0)
})

it('does not time out or replay a mutation while Safari owns the request', async () => {
  jest.useFakeTimers()
  let complete: () => void
  raw.tabs.reload.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve
      }),
  )
  const operation = api.tabs.reload(1)
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await jest.advanceTimersByTimeAsync(6000)
  expect(raw.tabs.reload).toHaveBeenCalledTimes(1)
  expect(safariState.error).toBe('')
  complete!()
  await operation
})

it('bounds an unresponsive read and reports an actionable error', async () => {
  jest.useFakeTimers()
  raw.tabs.query.mockReturnValue(new Promise(() => {}))
  const result = await expect(api.tabs.query()).rejects.toThrow(
    'Safari did not respond',
  )
  await jest.advanceTimersByTimeAsync(5000)
  await result
  expect(safariState.error).toContain('Refresh the view')
})

it('filters private windows/tabs and duplicate pinned appearances', async () => {
  raw.windows.getAll.mockResolvedValue([
    {
      id: 1,
      focused: false,
      tabs: [
        { id: 7, windowId: 2 },
        { id: 8, windowId: 1 },
        { id: 9, incognito: true },
      ],
    },
    { id: 2, focused: true, tabs: [{ id: 7, windowId: 2 }] },
    { id: 3, incognito: true, tabs: [{ id: 10 }] },
  ])
  const windows = await api.windows.getAll({ populate: true })
  expect(windows.map((win) => win.tabs.map((tab) => tab.id))).toEqual([
    [8],
    [7],
  ])
  expect(windows[0].tabs[0]).toMatchObject({
    title: 'Untitled tab',
    url: '',
    groupId: -1,
  })
  expect(api.storage.sync).toBe(raw.storage.local)
})

it('closes a normal window directly but rejects a private window', async () => {
  raw.windows.get
    .mockResolvedValueOnce({ id: 4 })
    .mockResolvedValueOnce({ id: 5, incognito: true })
  await api.windows.remove(4)
  await expect(api.windows.remove(5)).rejects.toThrow()
  expect(raw.windows.remove).toHaveBeenCalledTimes(1)
  expect(raw.windows.remove).toHaveBeenCalledWith(4)
})

it('accepts supported tab updates and rejects unsupported mutations', async () => {
  raw.tabs.update.mockResolvedValue({ id: 1, pinned: true })
  await api.tabs.update(1, { pinned: true })
  expect(raw.tabs.update).toHaveBeenCalledWith(1, { pinned: true })
  await expect(api.tabs.update(1, { muted: true })).rejects.toThrow(
    'unavailable',
  )
  await expect(api.tabs.move()).rejects.toThrow('unavailable')
  expect(raw.tabs.update).toHaveBeenCalledTimes(1)
})

it('wraps public creation events once and removes the same listener', () => {
  const callback = jest.fn()
  api.tabs.onCreated.addListener(callback)
  api.tabs.onCreated.addListener(callback)
  const wrapped = raw.tabs.onCreated.addListener.mock.calls[0][0]
  wrapped({ id: 1, incognito: true })
  wrapped({ id: 2 })
  expect(callback).toHaveBeenCalledTimes(1)
  expect(callback).toHaveBeenCalledWith(
    expect.objectContaining({ id: 2, url: '' }),
  )
  expect(raw.tabs.onCreated.addListener).toHaveBeenCalledTimes(1)
  api.tabs.onCreated.removeListener(callback)
  expect(raw.tabs.onCreated.removeListener).toHaveBeenCalledWith(wrapped)
})
