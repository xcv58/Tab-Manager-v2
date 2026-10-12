import TabHistory from '../TabHistory'
import { browser, setLastFocusedWindowId, setSelfPopupActive } from 'libs'

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

  it('records last focused window when popup.html?not_popup=1 is opened in a normal window', async () => {
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
    expect(setLastFocusedWindowId).toHaveBeenCalledWith(42)
    expect(tabHistory.tabHistory).toEqual([
      expect.objectContaining({
        tabId: 7,
        windowId: 42,
      }),
    ])
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
    history.count = 1
    history.reset()
    expect(history.tabHistory).toEqual([])
    history.add({ tabId: 7, windowId: 42 })
    expect(history.tabHistory).toEqual([{ tabId: 7, windowId: 42 }])
  })
})
