import FocusStore from 'stores/FocusStore'
import Window from 'stores/Window'

describe('FocusStore', () => {
  const createStore = (collapsed = true) => {
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
        matchedSet: new Set([1, 2, 3]),
      },
      tabGroupStore: {
        getTabGroup: (groupId: number) =>
          groupId === 100
            ? {
                id: 100,
                collapsed,
                color: 'blue',
                title: 'Collapsed',
                windowId: 1,
              }
            : null,
        getTabsForGroup: (groupId: number) =>
          store.windowStore.tabs.filter((tab) => tab.groupId === groupId),
        hasTabGroupsApi: () => true,
        isNoGroupId: (groupId: number) => groupId === -1,
        toggleSelectGroup: (groupId: number) => {
          const tabs = store.windowStore.tabs.filter(
            (tab) => tab.groupId === groupId,
          )
          const allSelected = tabs.every((tab) =>
            store.tabStore.selection.has(tab.id),
          )
          if (allSelected) {
            tabs.forEach((tab) => store.tabStore.selection.delete(tab.id))
            return
          }
          tabs.forEach((tab) => store.tabStore.selection.set(tab.id, tab))
        },
      },
      tabStore: {
        isTabSelected: ({ id }: { id: number }) =>
          store.tabStore.selection.has(id),
        selectAll: (tabs) => {
          tabs.forEach((tab) => store.tabStore.selection.set(tab.id, tab))
        },
        unselectAll: (tabs) => {
          if (!tabs) {
            store.tabStore.selection.clear()
            return
          }
          tabs.forEach((tab) => store.tabStore.selection.delete(tab.id))
        },
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
    return store
  }

  const setRect = (item, top: number) => {
    item.setNodeRef({
      current: {
        getBoundingClientRect: () => ({
          top,
          bottom: top + 40,
          left: 0,
          right: 320,
        }),
      },
    })
  }

  it('falls back to the visible group row when the active tab is hidden in a collapsed group', () => {
    const store = createStore(true)
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

    expect(store.focusStore.focusedGroupId).toBe(100)
    expect(store.focusStore.focusedTabId).toBeNull()
  })

  it('moves focus through visible group rows with vertical navigation', () => {
    const store = createStore(false)
    const win = new Window(
      {
        id: 1,
        tabs: [
          {
            id: 1,
            active: false,
            groupId: 100,
            index: 0,
            title: 'Grouped A',
            url: 'https://example.com/a',
            windowId: 1,
          },
          {
            id: 2,
            active: false,
            groupId: 100,
            index: 1,
            title: 'Grouped B',
            url: 'https://example.com/b',
            windowId: 1,
          },
          {
            id: 3,
            active: false,
            groupId: -1,
            index: 2,
            title: 'Ungrouped',
            url: 'https://example.com/c',
            windowId: 1,
          },
        ],
      },
      store,
    )
    store.windowStore.tabs = win.tabs
    store.windowStore.windows = [win]
    store.focusStore.setContainerRef({
      current: {
        scrollTop: 0,
      },
    })
    const groupRow = win.getGroupRow(100)
    setRect(groupRow, 0)
    setRect(win.tabs[0], 40)
    setRect(win.tabs[1], 80)
    setRect(win.tabs[2], 120)

    store.focusStore.focus(groupRow)
    store.focusStore.down()
    expect(store.focusStore.focusedTabId).toBe(1)

    store.focusStore.up()
    expect(store.focusStore.focusedGroupId).toBe(100)
  })

  it('selects the whole group for group-focused x and shift+x behavior', () => {
    const store = createStore(false)
    const win = new Window(
      {
        id: 1,
        tabs: [
          {
            id: 1,
            active: false,
            groupId: 100,
            index: 0,
            title: 'Grouped A',
            url: 'https://example.com/a',
            windowId: 1,
          },
          {
            id: 2,
            active: false,
            groupId: 100,
            index: 1,
            title: 'Grouped B',
            url: 'https://example.com/b',
            windowId: 1,
          },
          {
            id: 3,
            active: false,
            groupId: -1,
            index: 2,
            title: 'Ungrouped',
            url: 'https://example.com/c',
            windowId: 1,
          },
        ],
      },
      store,
    )
    store.windowStore.tabs = win.tabs
    store.windowStore.windows = [win]
    const groupRow = win.getGroupRow(100)

    store.focusStore.focus(groupRow)
    store.focusStore.select()
    expect(Array.from(store.tabStore.selection.keys())).toEqual([1, 2])

    store.tabStore.selection.clear()
    store.focusStore.selectWindow()
    expect(Array.from(store.tabStore.selection.keys())).toEqual([1, 2])
  })

  it('selects the whole group for shift+x when a grouped tab is focused', () => {
    const store = createStore(false)
    const win = new Window(
      {
        id: 1,
        tabs: [
          {
            id: 1,
            active: false,
            groupId: 100,
            index: 0,
            title: 'Grouped A',
            url: 'https://example.com/a',
            windowId: 1,
          },
          {
            id: 2,
            active: false,
            groupId: 100,
            index: 1,
            title: 'Grouped B',
            url: 'https://example.com/b',
            windowId: 1,
          },
          {
            id: 3,
            active: false,
            groupId: -1,
            index: 2,
            title: 'Ungrouped',
            url: 'https://example.com/c',
            windowId: 1,
          },
        ],
      },
      store,
    )
    store.windowStore.tabs = win.tabs
    store.windowStore.windows = [win]

    store.focusStore.focus(win.tabs[0])
    store.focusStore.selectWindow()
    expect(Array.from(store.tabStore.selection.keys())).toEqual([1, 2])
  })
})
