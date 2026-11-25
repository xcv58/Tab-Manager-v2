import TabHistory from '../TabHistory'
import {
  activateTab,
  browser,
  setLastFocusedWindowId,
  setSelfPopupActive,
} from 'libs'

const popupUrl =
  'chrome-extension://ehkonpddnilnaghlnblmghpdobeomohi/popup.html?not_popup=1'

jest.mock('libs', () => ({
  browser: {
    tabs: {
      onActivated: {
        addListener: jest.fn(),
      },
      onRemoved: {
        addListener: jest.fn(),
      },
      query: jest.fn(),
      get: jest.fn(),
    },
    windows: {
      onFocusChanged: {
        addListener: jest.fn(),
      },
      get: jest.fn(),
      getAll: jest.fn().mockResolvedValue([]),
    },
    storage: {
      local: {
        get: jest.fn(() => Promise.resolve({ tabHistory: [] })),
        set: jest.fn(() => Promise.resolve()),
      },
    },
  },
  activateTab: jest.fn(),
  setLastFocusedWindowId: jest.fn(),
  setSelfPopupActive: jest.fn(),
  isSelfPopupTab: jest.fn(
    (tab) => tab.url === popupUrl || tab.pendingUrl === popupUrl,
  ),
  isSelfPopup: jest.fn(({ type, tabs = [] }) => {
    if (type !== 'popup' || tabs.length !== 1) {
      return false
    }
    const [tab] = tabs
    return tab.url === popupUrl || tab.pendingUrl === popupUrl
  }),
}))

describe('TabHistory.onFocusChanged', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(browser.storage.local.get as jest.Mock).mockResolvedValue({
      tabHistory: [],
    })
  })

  it('records the window but excludes a full-tab manager from recent-tab history', async () => {
    ;(browser.tabs.query as jest.Mock).mockResolvedValue([
      {
        id: 7,
        active: true,
        windowId: 42,
        url: popupUrl,
      },
    ])
    ;(browser.windows.get as jest.Mock).mockResolvedValue({
      id: 42,
      type: 'normal',
      tabs: [
        {
          id: 7,
          active: true,
          windowId: 42,
          url: popupUrl,
        },
      ],
    })

    const tabHistory = new TabHistory()

    await tabHistory.onFocusChanged(42)

    expect(setSelfPopupActive).not.toHaveBeenCalledWith(true)
    expect(setLastFocusedWindowId).toHaveBeenCalledWith(42, {
      42: expect.any(Number),
    })
    expect(tabHistory.tabHistory).toEqual([])
  })

  it('records background window focus in event order and drops closed windows', async () => {
    let windowLastFocusedAt: Record<string, number> = { 2: 100, 99: 150 }
    const savedAt = jest.spyOn(Date, 'now').mockReturnValue(200)
    jest
      .mocked(browser.windows.getAll)
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
    jest.mocked(browser.windows.get).mockImplementation(async (id) => ({
      id,
      type: 'normal',
      tabs: [{ id: id * 10, active: true, windowId: id }],
    }))
    jest
      .mocked(browser.storage.local.get)
      .mockImplementation(async (keys) =>
        keys && 'windowLastFocusedAt' in keys
          ? { windowLastFocusedAt }
          : { tabHistory: [] },
      )
    jest
      .mocked(setLastFocusedWindowId)
      .mockImplementation(async (_id, timestamps) => {
        windowLastFocusedAt = timestamps
      })

    try {
      const history = new TabHistory()
      await Promise.all([history.onFocusChanged(1), history.onFocusChanged(2)])

      expect(setLastFocusedWindowId).toHaveBeenNthCalledWith(1, 1, {
        1: 200,
        2: 100,
      })
      expect(setLastFocusedWindowId).toHaveBeenNthCalledWith(2, 2, {
        1: 200,
        2: 201,
      })
    } finally {
      savedAt.mockRestore()
      jest.mocked(setLastFocusedWindowId).mockReset()
    }
  })

  it('keeps only navigation IDs when loading legacy history metadata', async () => {
    ;(browser.storage.local.get as jest.Mock).mockResolvedValue({
      tabHistory: [
        {
          tabId: 7,
          windowId: 42,
          title: 'Old title',
          favIconUrl: 'data:image/png;base64,large',
        },
        null,
      ],
    })
    const history = new TabHistory()
    await history.init()
    expect(history.tabHistory).toEqual([{ tabId: 7, windowId: 42 }])
  })

  it('does not create an invalid entry when cycling an empty history', async () => {
    const history = new TabHistory()
    await history.init()
    await history.activateTab()
    expect(activateTab).not.toHaveBeenCalled()
    expect(history.tabHistory).toEqual([])
    history.add({ tabId: 7, windowId: 42 })
    expect(history.tabHistory).toEqual([{ tabId: 7, windowId: 42 }])
  })
})
