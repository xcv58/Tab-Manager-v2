import WindowStore from 'stores/WindowStore'
import Window from 'stores/Window'
import { browser } from 'libs'

jest.mock('libs', () => ({
  browser: {
    windows: {
      onCreated: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
      onFocusChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
      getAll: jest.fn(() => Promise.resolve([])),
      get: jest.fn(() => Promise.resolve({ id: 1, tabs: [] })),
      update: jest.fn(),
    },
    tabs: {
      onActivated: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
      onAttached: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
      onCreated: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
      onDetached: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
      onMoved: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
      onRemoved: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
      onUpdated: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
      onReplaced: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
    },
    runtime: {
      sendMessage: jest.fn(),
    },
  },
  moveTabs: jest.fn(() => Promise.resolve()),
  getLastFocusedWindowId: jest.fn(() => Promise.resolve(null)),
  notSelfPopup: jest.fn(() => true),
  windowComparator: jest.fn(() => 0),
  isSelfPopup: jest.fn(() => false),
}))

const setVisibleLengths = (store: WindowStore, lengths: number[]) => {
  store.windows = lengths.map((length, idx) => ({
    id: idx + 1,
    visibleLength: length,
    tabs: [{ id: idx + 1 }],
    hide: false,
  })) as any
}

const createWindowStore = () => {
  ;(browser.windows.getAll as jest.Mock).mockImplementation(
    () => new Promise(() => {}),
  )
  const mockStore: any = {
    userStore: {
      fontSize: 14,
      tabWidth: 20,
      showAppWindow: true,
      showUnmatchedTab: true,
    },
    tabStore: {
      selection: new Map(),
    },
    hiddenWindowStore: {
      showWindow: jest.fn(),
      hiddenWindows: {},
    },
    focusStore: {
      containerRef: { current: null },
      setDefaultFocusedTab: jest.fn(),
    },
    searchStore: {
      matchedSet: new Set(),
      _query: '',
    },
    tabGroupStore: {
      hasTabGroupsApi: () => false,
      isNoGroupId: (groupId: number) => groupId === -1,
    },
  }
  const windowStore = new WindowStore(mockStore)
  mockStore.windowStore = windowStore
  return windowStore
}

describe('WindowStore layout policy', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('markLayoutDirtyIfNeeded marks only when computed layout differs', () => {
    const windowStore = createWindowStore()
    windowStore.height = 600
    setVisibleLengths(windowStore, [10, 10])
    windowStore.repackLayout('manual')

    setVisibleLengths(windowStore, [9, 9])
    expect(windowStore.markLayoutDirtyIfNeeded('group-toggle', 1)).toBe(false)
    expect(windowStore.layoutDirty).toBe(false)

    setVisibleLengths(windowStore, [3, 3])
    expect(windowStore.markLayoutDirtyIfNeeded('group-toggle', 1)).toBe(true)
    expect(windowStore.layoutDirty).toBe(true)
  })

  it('keeps rendered columns stable after dirty mark until manual repack', () => {
    const windowStore = createWindowStore()
    windowStore.height = 600
    setVisibleLengths(windowStore, [10, 10])
    windowStore.repackLayout('manual')

    setVisibleLengths(windowStore, [3, 3])
    windowStore.markLayoutDirtyIfNeeded('group-toggle', 1)

    expect(windowStore.layoutDirty).toBe(true)
    expect(windowStore.columnCount).toBe(2)
    expect(windowStore.visibleColumn).toBe(2)
    expect(windowStore.columnLayout).toEqual([[1], [2]])
    expect(windowStore.rawVisibleColumn).toBe(1)
  })

  it('repackLayout runs immediately on resize and clears dirty state', () => {
    const windowStore = createWindowStore()
    windowStore.height = 600
    setVisibleLengths(windowStore, [10, 10])
    windowStore.repackLayout('manual')

    windowStore.markLayoutDirtyIfNeeded('window-toggle', 1)
    windowStore.lastViewportHeight = 1
    windowStore.updateHeight(900)

    expect(windowStore.layoutDirty).toBe(false)
    expect(windowStore.columnCount).toBe(1)
    expect(windowStore.columnLayout).toEqual([[1, 2]])
  })

  it('uses a minimum row height when font size is very small', () => {
    const windowStore = createWindowStore()
    windowStore.height = 100
    windowStore.store.userStore.fontSize = 8
    setVisibleLengths(windowStore, [2, 2])

    windowStore.repackLayout('manual')

    expect(windowStore.columnCount).toBe(2)
    expect(windowStore.columnLayout).toEqual([[1], [2]])
  })

  it('renders only nearby columns for the horizontal viewport', () => {
    const windowStore = createWindowStore()
    windowStore.height = 200
    windowStore.width = 320
    setVisibleLengths(windowStore, [4, 4, 4, 4])

    windowStore.repackLayout('manual')
    windowStore.updateScroll(0, 0)
    expect(
      windowStore.renderedColumnLayouts.map((column) => column.columnIndex),
    ).toEqual([0, 1])

    windowStore.updateScroll(0, 640)
    expect(
      windowStore.renderedColumnLayouts.map((column) => column.columnIndex),
    ).toEqual([1, 2, 3])
  })

  it('calculates visible row ranges for oversized windows', () => {
    const windowStore = createWindowStore()
    const win = new Window(
      {
        id: 1,
        tabs: Array.from({ length: 20 }, (_, index) => ({
          id: index + 1,
          index,
          windowId: 1,
          title: `Tab ${index + 1}`,
          url: `https://example.com/${index + 1}`,
          groupId: -1,
        })),
      },
      windowStore.store as any,
    )
    windowStore.height = 200
    windowStore.width = 320
    windowStore.scrollTop = 400
    windowStore.windows = [win]

    windowStore.repackLayout('manual')

    expect(windowStore.getVisibleRowRange(win)).toEqual({
      start: 4,
      end: 18,
    })
  })

  it('clearWindow repacks immediately when removed window is the only one in its column', () => {
    const windowStore = createWindowStore()
    windowStore.height = 350
    setVisibleLengths(windowStore, [4, 4, 4])
    windowStore.repackLayout('manual')

    windowStore.windows.find((win) => win.id === 3)!.tabs = [] as any
    const result = windowStore.clearWindow()

    expect(result.repacked).toBe(true)
    expect(windowStore.layoutDirty).toBe(false)
    expect(windowStore.columnLayout).toEqual([[1, 2]])
  })

  it('clearWindow only marks dirty when removed window shares a rendered column', () => {
    const windowStore = createWindowStore()
    windowStore.height = 350
    setVisibleLengths(windowStore, [4, 4, 4])
    windowStore.repackLayout('manual')

    windowStore.windows.find((win) => win.id === 2)!.tabs = [] as any
    const result = windowStore.clearWindow()

    expect(result.repacked).toBe(false)
    expect(windowStore.layoutDirty).toBe(true)
    expect(windowStore.columnLayout).toEqual([[1, 2], [3]])
  })

  it('loadAllWindows with repackPolicy never marks dirty but does not repack', async () => {
    const windowStore = createWindowStore()
    windowStore.height = 600
    setVisibleLengths(windowStore, [10, 10])
    windowStore.repackLayout('manual')
    const columnLayoutBefore = windowStore.columnLayout.map((column) =>
      column.slice(),
    )
    ;(browser.windows.getAll as jest.Mock).mockResolvedValueOnce([
      {
        id: 1,
        tabs: [
          { id: 11, index: 0, windowId: 1, title: '1', url: 'about:blank' },
        ],
      },
      {
        id: 2,
        tabs: [
          { id: 21, index: 0, windowId: 2, title: '2', url: 'about:blank' },
        ],
      },
    ])

    await windowStore.loadAllWindows({
      repackPolicy: 'never',
      reason: 'window-focus',
    })

    expect(windowStore.columnLayout).toEqual(columnLayoutBefore)
    expect(windowStore.layoutDirty).toBe(true)
  })

  it('sync keeps existing window order when browser data has same windows', async () => {
    const windowStore = createWindowStore()
    windowStore.initialLoading = false
    windowStore.windows = [
      { id: 3, tabs: [{ id: 31 }], hide: false, visibleLength: 3 },
      { id: 1, tabs: [{ id: 11 }], hide: false, visibleLength: 3 },
      { id: 2, tabs: [{ id: 21 }], hide: false, visibleLength: 3 },
    ] as any
    ;(browser.windows.getAll as jest.Mock).mockResolvedValueOnce([
      {
        id: 1,
        tabs: [
          { id: 11, index: 0, windowId: 1, title: '1', url: 'about:blank' },
        ],
      },
      {
        id: 2,
        tabs: [
          { id: 21, index: 0, windowId: 2, title: '2', url: 'about:blank' },
        ],
      },
      {
        id: 3,
        tabs: [
          { id: 31, index: 0, windowId: 3, title: '3', url: 'about:blank' },
        ],
      },
    ])

    await windowStore.loadAllWindows({
      repackPolicy: 'always',
      reason: 'sync',
    })

    expect(windowStore.windows.map((win) => win.id)).toEqual([3, 1, 2])
  })

  it('restores default focus only on the initial load', async () => {
    const windowStore = createWindowStore()
    const setDefaultFocusedTabWithOptions = jest.fn()
    ;(windowStore.store as any).focusStore = {
      setDefaultFocusedTabWithOptions,
    }
    ;(browser.windows.getAll as jest.Mock).mockResolvedValueOnce([
      {
        id: 1,
        tabs: [
          { id: 11, index: 0, windowId: 1, title: '1', url: 'about:blank' },
        ],
      },
    ])

    await windowStore.loadAllWindows({
      repackPolicy: 'always',
      reason: 'initial-load',
    })

    expect(setDefaultFocusedTabWithOptions).toHaveBeenCalledWith({
      reveal: true,
      fallbackWhenActiveHidden: false,
    })
    ;(browser.windows.getAll as jest.Mock).mockResolvedValueOnce([
      {
        id: 1,
        tabs: [
          { id: 11, index: 0, windowId: 1, title: '1', url: 'about:blank' },
        ],
      },
    ])

    await windowStore.loadAllWindows({
      repackPolicy: 'always',
      reason: 'sync',
    })

    expect(setDefaultFocusedTabWithOptions).toHaveBeenCalledTimes(1)
  })

  it('suppresses duplicate lifecycle triggers in the same family', () => {
    const windowStore = createWindowStore()
    expect(windowStore.shouldSuppressLifecycleTrigger('foreground')).toBe(false)
    expect(windowStore.shouldSuppressLifecycleTrigger('foreground')).toBe(true)
    expect(windowStore.shouldSuppressLifecycleTrigger('background')).toBe(false)
    expect(windowStore.shouldSuppressLifecycleTrigger('background')).toBe(true)
  })

  it('derives duplicate helpers from cached duplicate families', () => {
    const windowStore = createWindowStore()
    const alphaA = { id: 11, fingerPrint: 'alpha' }
    const alphaB = { id: 12, fingerPrint: 'alpha' }
    const betaA = { id: 21, fingerPrint: 'beta' }
    const betaB = { id: 22, fingerPrint: 'beta' }
    const betaC = { id: 23, fingerPrint: 'beta' }
    const gamma = { id: 31, fingerPrint: 'gamma' }

    windowStore.windows = [
      {
        id: 1,
        hide: false,
        tabs: [alphaA, alphaB, betaA, betaB, betaC, gamma],
        visibleLength: 8,
      },
    ] as any

    expect(windowStore.tabFingerprintMap).toEqual({
      alpha: 2,
      beta: 3,
      gamma: 1,
    })
    expect(windowStore.duplicatedTabs.map((tab) => tab.id)).toEqual([
      11, 12, 21, 22, 23,
    ])
    expect(windowStore.getDuplicateTabsToRemove().map((tab) => tab.id)).toEqual(
      [12, 22, 23],
    )
    expect(
      windowStore
        .getDuplicateTabsToRemove([betaB, betaC] as any)
        .map((tab) => tab.id),
    ).toEqual([23])
  })

  it('repackages columns when a tab group assignment changes visible rows', () => {
    const windowStore = createWindowStore()
    ;(windowStore.store as any).tabGroupStore = {
      hasTabGroupsApi: () => true,
      isNoGroupId: (groupId: number) => groupId === -1,
      getRowsForWindow: (win) => {
        const rows: any[] = []
        const seenGroupIds = new Set<number>()
        win.tabs.forEach((tab) => {
          if (tab.groupId === -1) {
            rows.push({ kind: 'tab', tabId: tab.id })
            return
          }
          if (!seenGroupIds.has(tab.groupId)) {
            seenGroupIds.add(tab.groupId)
            rows.push({ kind: 'group', groupId: tab.groupId })
          }
          rows.push({ kind: 'tab', tabId: tab.id })
        })
        return rows
      },
    }
    windowStore.height = 260
    windowStore.windows = [
      new Window(
        {
          id: 1,
          tabs: [
            {
              id: 11,
              index: 0,
              windowId: 1,
              title: 'Window 1',
              url: 'https://example.com/1',
              groupId: -1,
            },
          ],
        },
        windowStore.store as any,
      ),
      new Window(
        {
          id: 2,
          tabs: [
            {
              id: 21,
              index: 0,
              windowId: 2,
              title: 'Window 2',
              url: 'https://example.com/2',
              groupId: -1,
            },
          ],
        },
        windowStore.store as any,
      ),
    ]

    windowStore.repackLayout('manual')
    expect(windowStore.columnCount).toBe(1)

    windowStore.onUpdated(11, {}, {
      id: 11,
      index: 0,
      windowId: 1,
      title: 'Window 1',
      url: 'https://example.com/1',
      groupId: 100,
    } as any)

    expect(windowStore.columnCount).toBe(2)
    expect(windowStore.columnLayout).toEqual([[1], [2]])
  })
})
