import TabHistory from '../TabHistory'
import { activateTab, browser } from 'libs'

jest.mock('libs/browserCapabilities', () => ({ isSafari: true }))
jest.mock('libs', () => ({
  browser: {
    tabs: {
      onActivated: { addListener: jest.fn() },
      onCreated: { addListener: jest.fn() },
      onUpdated: { addListener: jest.fn() },
      onRemoved: { addListener: jest.fn() },
      get: jest.fn(),
    },
    windows: {
      onFocusChanged: { addListener: jest.fn() },
      getAll: jest.fn(),
      get: jest.fn(),
    },
    storage: {
      local: { get: jest.fn(), set: jest.fn().mockResolvedValue(undefined) },
    },
  },
  activateTab: jest.fn(),
  setLastFocusedWindowId: jest.fn(),
  setSelfPopupActive: jest.fn(),
  isSelfPopupTab: (tab) => tab.id === 99,
  isSelfPopup: (win) => win.type === 'popup',
}))

let current: number
const tabs = [1, 2, 3, 99].map((id) => ({ id, windowId: 10 }))
let history: TabHistory
beforeEach(async () => {
  jest.clearAllMocks()
  current = 3
  jest.mocked(browser.storage.local.get).mockResolvedValue({ tabHistory: [] })
  jest.mocked(browser.windows.getAll).mockImplementation(
    async () =>
      [
        {
          id: 10,
          focused: true,
          tabs: tabs.map((tab) => ({ ...tab, active: tab.id === current })),
        },
      ] as any,
  )
  jest
    .mocked(browser.tabs.get)
    .mockImplementation(
      async (id) => ({ id, windowId: 10, active: id === current }) as any,
    )
  jest
    .mocked(browser.windows.get)
    .mockImplementation(async () => ({ id: 10, focused: true }) as any)
  jest.mocked(activateTab).mockImplementation(async (id) => {
    current = id
    await history.onActivated({ tabId: id, windowId: 10 })
  })
  history = new TabHistory()
  await history.init()
  for (const tabId of [1, 2, 3]) history.add({ tabId, windowId: 10 })
})

it('wraps across the full recent-tab list over repeated shortcut presses', async () => {
  for (let i = 0; i < 8; i++) await history.activateTab()
  expect(jest.mocked(activateTab).mock.calls.map(([id]) => id)).toEqual([
    2, 1, 3, 2, 1, 3, 2, 1,
  ])
})

it('serializes rapid shortcut presses and excludes the manager and closed tabs', async () => {
  history.add({ tabId: 77, windowId: 10 })
  history.add({ tabId: 99, windowId: 10 })
  await Promise.all([
    history.activateTab(),
    history.activateTab(),
    history.activateTab(),
  ])
  expect(jest.mocked(activateTab).mock.calls.map(([id]) => id)).toEqual([
    2, 1, 3,
  ])
  expect(history.tabHistory.map((entry) => entry.tabId)).not.toEqual(
    expect.arrayContaining([77, 99]),
  )
})

it('remembers a newly created active tab even without an activation event', async () => {
  const created = jest.mocked(browser.tabs.onCreated.addListener).mock
    .calls[0][0]
  current = 4
  await created({ id: 4 } as any)
  expect(history.tabHistory.at(-1)).toEqual({ tabId: 4, windowId: 10 })
  expect(history.tabHistory.at(-1)).not.toHaveProperty('title')
})

it('starts from the current browser tab after a manual switch', async () => {
  await history.activateTab()
  current = 1
  await history.onActivated({ tabId: 1, windowId: 10 })
  await history.activateTab()
  expect(activateTab).toHaveBeenLastCalledWith(2, true)
})
