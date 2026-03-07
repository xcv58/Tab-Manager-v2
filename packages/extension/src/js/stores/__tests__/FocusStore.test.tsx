import FocusStore from 'stores/FocusStore'
import Window from 'stores/Window'

describe('FocusStore', () => {
  it('falls back to the first visible matched tab when the active tab is hidden', () => {
    const store: any = {
      arrangeStore: {
        getTabsForDomain: () => [],
      },
      hiddenWindowStore: {
        hiddenWindows: {},
      },
      hoverStore: {
        hoveredTabId: null,
      },
      searchStore: {
        _query: '',
        matchedSet: new Set([1, 2]),
      },
      tabGroupStore: {
        getTabGroup: (groupId: number) =>
          groupId === 100
            ? {
                id: 100,
                collapsed: true,
                color: 'blue',
                title: 'Collapsed',
                windowId: 1,
              }
            : null,
        hasTabGroupsApi: () => true,
        isNoGroupId: (groupId: number) => groupId === -1,
      },
      tabStore: {
        isTabSelected: () => false,
        selection: new Map(),
      },
      userStore: {
        ignoreHash: false,
        showUnmatchedTab: true,
      },
      windowStore: {
        initialLoading: false,
        lastFocusedWindowId: 1,
        tabs: [],
        windows: [],
      },
    }
    store.focusStore = new FocusStore(store)
    const win = new Window(
      {
        id: 1,
        tabs: [
          {
            id: 1,
            active: true,
            groupId: 100,
            index: 0,
            title: 'Hidden active tab',
            url: 'https://example.com/hidden',
            windowId: 1,
          },
          {
            id: 2,
            active: false,
            groupId: -1,
            index: 1,
            title: 'Visible tab',
            url: 'https://example.com/visible',
            windowId: 1,
          },
        ],
      },
      store,
    )
    store.windowStore.tabs = win.tabs
    store.windowStore.windows = [win]
    store.windowStore.lastFocusedWindow = win

    store.focusStore.setDefaultFocusedTab()

    expect(store.focusStore.focusedTabId).toBe(2)
  })
})
