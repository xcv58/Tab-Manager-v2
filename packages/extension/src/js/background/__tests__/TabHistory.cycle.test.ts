import TabHistory from '../TabHistory'
import { activateTab, browser } from 'libs'

let mockSafari = false
jest.mock('libs/browserCapabilities', () => ({
  get isSafari() {
    return mockSafari
  },
}))
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

describe.each([false, true])(
  'shared recent-tab cycling (Safari=%s)',
  (safari) => {
    let current: number
    let now: number
    let available: Set<number>
    let history: TabHistory
    const tabs = () =>
      [...available].map((id) => ({ id, windowId: 10, active: id === current }))
    beforeEach(async () => {
      jest.clearAllMocks()
      mockSafari = safari
      current = 3
      now = 10_000
      available = new Set([1, 2, 3, 99])
      jest.spyOn(Date, 'now').mockImplementation(() => now)
      jest
        .mocked(browser.storage.local.get)
        .mockResolvedValue({ tabHistory: [] })
      jest
        .mocked(browser.windows.getAll)
        .mockImplementation(
          async () =>
            [{ id: 10, focused: true, type: 'normal', tabs: tabs() }] as any,
        )
      jest
        .mocked(browser.windows.get)
        .mockImplementation(
          async () =>
            ({ id: 10, focused: true, type: 'normal', tabs: tabs() }) as any,
        )
      jest.mocked(browser.tabs.get).mockImplementation(async (id) => {
        const tab = tabs().find((tab) => tab.id === id)
        if (!tab) throw new Error('Tab is closed')
        return tab as any
      })
      jest.mocked(activateTab).mockImplementation(async (id) => {
        current = id
        await history.onActivated({ tabId: id, windowId: 10 })
      })
      history = new TabHistory()
      await history.init()
      for (const tabId of [1, 2, 3]) history.add({ tabId, windowId: 10 })
    })
    afterEach(() => jest.restoreAllMocks())

    it('wraps through a fixed order while activation events update live history', async () => {
      for (let i = 0; i < 8; i++) await history.activateTab()
      expect(jest.mocked(activateTab).mock.calls.map(([id]) => id)).toEqual([
        2, 1, 3, 2, 1, 3, 2, 1,
      ])
    })

    it('skips closed tabs and manager views, including when starting from the manager', async () => {
      current = 99
      history.add({ tabId: 77, windowId: 10 })
      history.add({ tabId: 99, windowId: 10 })
      await history.activateTab()
      expect(activateTab).toHaveBeenLastCalledWith(3, true)
      await history.onActivated({ tabId: 99, windowId: 10 })
      expect(history.tabHistory.map((entry) => entry.tabId)).not.toEqual(
        expect.arrayContaining([77, 99]),
      )
    })

    it('skips a result that closes during a cycle', async () => {
      await history.activateTab()
      available.delete(1)
      await history.onRemoved(1)
      await history.activateTab()
      expect(activateTab).toHaveBeenLastCalledWith(3, true)
    })

    it('starts a new cycle after the user pauses', async () => {
      await history.activateTab()
      now += 1100
      await history.activateTab()
      expect(jest.mocked(activateTab).mock.calls.map(([id]) => id)).toEqual([
        2, 3,
      ])
    })

    it('starts from a manual tab switch', async () => {
      await history.activateTab()
      current = 1
      await history.onActivated({ tabId: 1, windowId: 10 })
      await history.activateTab()
      expect(activateTab).toHaveBeenLastCalledWith(2, true)
    })

    it('keeps queued presses in the same cycle when browser IPC is slow', async () => {
      jest.mocked(activateTab).mockImplementation(async (id) => {
        current = id
        now += 2000
        await history.onActivated({ tabId: id, windowId: 10 })
      })
      await Promise.all([
        history.activateTab(),
        history.activateTab(),
        history.activateTab(),
      ])
      expect(jest.mocked(activateTab).mock.calls.map(([id]) => id)).toEqual([
        2, 1, 3,
      ])
    })
  },
)
