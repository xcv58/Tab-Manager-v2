import Window from 'stores/Window'

jest.mock('libs', () => {
  const actual = jest.requireActual('libs')
  return {
    ...actual,
    browser: {
      ...actual.browser,
      windows: {
        remove: jest.fn(),
        update: jest.fn(),
      },
      tabs: {
        get: jest.fn(),
      },
    },
  }
})

const createStore = () =>
  ({
    windowStore: {
      initialLoading: false,
    },
    hiddenWindowStore: {
      hiddenWindows: {},
    },
    tabStore: {
      selection: new Map(),
      selectAll: jest.fn(),
      unselectAll: jest.fn(),
    },
    userStore: {
      showUnmatchedTab: true,
    },
    searchStore: {
      matchedSet: new Set([1, 2, 3, 4]),
      _query: '',
    },
    hoverStore: {
      hover: jest.fn(),
      unhover: jest.fn(),
    },
    tabGroupStore: {
      hasTabGroupsApi: () => false,
    },
  }) as any

describe('Window', () => {
  it('reorders a moved tab and updates affected indices', () => {
    const win = new Window(
      {
        id: 1,
        tabs: [
          { id: 1, index: 0, windowId: 1, title: 'A', url: 'https://a.test' },
          { id: 2, index: 1, windowId: 1, title: 'B', url: 'https://b.test' },
          { id: 3, index: 2, windowId: 1, title: 'C', url: 'https://c.test' },
          { id: 4, index: 3, windowId: 1, title: 'D', url: 'https://d.test' },
        ],
      },
      createStore(),
    )

    const result = win.onMoved(1, {
      fromIndex: 0,
      toIndex: 2,
    })

    expect(result).toBe(true)
    expect(win.tabs.map((tab) => tab.id)).toEqual([2, 3, 1, 4])
    expect(win.tabs.map((tab) => tab.index)).toEqual([0, 1, 2, 3])
  })
})
