import TabGroupStore from 'stores/TabGroupStore'
import { browser } from 'libs'

describe('TabGroupStore', () => {
  beforeEach(() => {
    ;(browser as any).tabGroups = {
      query: jest.fn(() => Promise.resolve([])),
      update: jest.fn((id, updateProperties) =>
        Promise.resolve({
          id,
          windowId: 1,
          title: '',
          color: 'grey',
          collapsed: false,
          ...updateProperties,
        }),
      ),
      move: jest.fn((id, moveProperties) =>
        Promise.resolve({
          id,
          windowId: moveProperties.windowId || 1,
          title: '',
          color: 'grey',
          collapsed: false,
        }),
      ),
      onCreated: { addListener: jest.fn() },
      onRemoved: { addListener: jest.fn() },
      onMoved: { addListener: jest.fn() },
      onUpdated: { addListener: jest.fn() },
    }
    ;(browser as any).tabs = {
      ungroup: jest.fn(),
      group: jest.fn(() => Promise.resolve(123)),
    }
    delete (global as any).chrome
  })

  afterEach(() => {
    delete (global as any).chrome
  })

  const groupStore = (windowStoreOverrides = {}) =>
    new TabGroupStore({
      windowStore: {
        tabs: [],
        markLayoutDirtyIfNeeded: jest.fn(),
        ...windowStoreOverrides,
      },
    } as any)

  it('should expose tab group capability flags', () => {
    const store = groupStore()
    expect(store.hasTabGroupsApi()).toBe(true)
    expect(store.canMutateGroups()).toBe(true)
    expect(store.canMoveGroups()).toBe(true)
  })

  it('should return false capabilities when tab group APIs are unavailable', () => {
    ;(browser as any).tabGroups = undefined
    ;(browser as any).tabs = {}
    ;(global as any).chrome = {
      runtime: {},
    }
    const store = groupStore()
    expect(store.hasTabGroupsApi()).toBe(false)
    expect(store.canMutateGroups()).toBe(false)
    expect(store.canMoveGroups()).toBe(false)
  })

  it('should no-op group creation when mutation capability is unavailable', async () => {
    ;(browser as any).tabGroups = undefined
    ;(browser as any).tabs = {}
    ;(global as any).chrome = { runtime: {} }
    const store = groupStore()

    const groupId = await store.createGroup([1, 2])

    expect(groupId).toBeNull()
  })

  it('should return grouped rows and visible tabs for collapsed groups with search', async () => {
    const tabs = [
      {
        id: 1,
        windowId: 1,
        groupId: 100,
        isVisible: true,
        isMatched: true,
        removing: false,
      },
      {
        id: 2,
        windowId: 1,
        groupId: 100,
        isVisible: false,
        isMatched: false,
        removing: false,
      },
      {
        id: 3,
        windowId: 1,
        groupId: -1,
        isVisible: true,
        isMatched: true,
        removing: false,
      },
    ] as any
    const mockStore = {
      searchStore: {
        matchedSet: new Set([1]),
        _query: 'pin',
      },
      windowStore: {
        tabs,
      },
      userStore: {
        showUnmatchedTab: false,
      },
    }
    const groupStore = new TabGroupStore(mockStore as any)
    groupStore.tabGroupMap = new Map([
      [
        100,
        {
          id: 100,
          windowId: 1,
          title: 'Docs',
          color: 'green',
          collapsed: true,
        },
      ],
    ])

    const rows = groupStore.getRowsForWindow({
      tabs,
    } as any)

    expect(rows).toEqual([
      {
        kind: 'group',
        groupId: 100,
        windowId: 1,
        title: 'Docs',
        color: 'green',
        collapsed: true,
        tabIds: [1, 2],
        matchedCount: 1,
      },
      {
        kind: 'tab',
        tabId: 1,
        windowId: 1,
        groupId: 100,
        hiddenByCollapse: false,
      },
      {
        kind: 'tab',
        tabId: 3,
        windowId: 1,
        groupId: -1,
        hiddenByCollapse: false,
      },
    ])
  })

  it('should update collapsed state via browser.tabGroups API', async () => {
    const store = groupStore()
    store.tabGroupMap = new Map([
      [
        42,
        {
          id: 42,
          windowId: 1,
          title: 'Group',
          color: 'blue',
          collapsed: false,
        },
      ],
    ])

    await store.toggleCollapsed(42)

    expect((browser as any).tabGroups.update).toHaveBeenCalledWith(42, {
      collapsed: true,
    })
    expect(
      (store as any).store.windowStore.markLayoutDirtyIfNeeded,
    ).toHaveBeenCalledWith('group-toggle', 1)
  })

  it('should update collapsed state via chrome.tabGroups fallback API', async () => {
    const store = groupStore()
    store.tabGroupMap = new Map([
      [
        42,
        {
          id: 42,
          windowId: 1,
          title: 'Group',
          color: 'blue',
          collapsed: false,
        },
      ],
    ])
    ;(browser as any).tabGroups.update = undefined
    const chromeUpdate = jest.fn((groupId, props, callback) => {
      callback({
        id: groupId,
        windowId: 1,
        title: 'Group',
        color: 'blue',
        collapsed: props.collapsed,
      })
    })
    ;(global as any).chrome = {
      runtime: {},
      tabGroups: {
        update: chromeUpdate,
      },
    }

    await store.toggleCollapsed(42)

    expect(chromeUpdate).toHaveBeenCalledWith(
      42,
      { collapsed: true },
      expect.any(Function),
    )
    expect(store.getTabGroup(42)?.collapsed).toBe(true)
  })

  it('should mark layout dirty for browser-origin collapsed changes', () => {
    const markLayoutDirtyIfNeeded = jest.fn()
    const store = groupStore({ markLayoutDirtyIfNeeded })
    store.tabGroupMap.set(77, {
      id: 77,
      windowId: 12,
      title: 'Group',
      color: 'blue',
      collapsed: false,
    })

    store.onTabGroup({
      id: 77,
      windowId: 12,
      title: 'Group',
      color: 'blue',
      collapsed: true,
    })

    expect(markLayoutDirtyIfNeeded).toHaveBeenCalledWith(
      'group-browser-event',
      12,
    )
  })

  it('should refresh layout for browser-origin group creation', () => {
    const refreshLayoutIfNeeded = jest.fn()
    const store = groupStore({ refreshLayoutIfNeeded })

    store.onTabGroup({
      id: 88,
      windowId: 3,
      title: 'Created',
      color: 'green',
      collapsed: false,
    })

    expect(refreshLayoutIfNeeded).toHaveBeenCalledWith(
      'window-change',
      'group-browser-event',
      3,
    )
  })

  it('should refresh layout for browser-origin group title changes', () => {
    const refreshLayoutIfNeeded = jest.fn()
    const store = groupStore({ refreshLayoutIfNeeded })
    store.tabGroupMap.set(77, {
      id: 77,
      windowId: 12,
      title: 'Before',
      color: 'blue',
      collapsed: false,
    })

    store.onTabGroup({
      id: 77,
      windowId: 12,
      title: 'After',
      color: 'blue',
      collapsed: false,
    })

    expect(refreshLayoutIfNeeded).toHaveBeenCalledWith(
      'window-change',
      'group-browser-event',
      12,
    )
  })

  it('should rename group through browser.tabGroups.update', async () => {
    const refreshLayoutIfNeeded = jest.fn()
    const store = groupStore({ refreshLayoutIfNeeded })
    store.tabGroupMap = new Map([
      [
        7,
        {
          id: 7,
          windowId: 1,
          title: 'Before',
          color: 'blue',
          collapsed: false,
        },
      ],
    ])

    await store.renameGroup(7, 'After')

    expect((browser as any).tabGroups.update).toHaveBeenCalledWith(7, {
      title: 'After',
    })
    expect(refreshLayoutIfNeeded).toHaveBeenCalledWith(
      'window-change',
      'group-browser-event',
      1,
    )
    expect(store.getTabGroup(7)?.title).toBe('After')
  })

  it('should recolor group through browser.tabGroups.update', async () => {
    const store = groupStore()
    store.tabGroupMap = new Map([
      [
        7,
        {
          id: 7,
          windowId: 1,
          title: 'Group',
          color: 'blue',
          collapsed: false,
        },
      ],
    ])

    await store.recolorGroup(7, 'red')

    expect((browser as any).tabGroups.update).toHaveBeenCalledWith(7, {
      color: 'red',
    })
    expect(store.getTabGroup(7)?.color).toBe('red')
  })

  it('should ungroup all tabs from target group', async () => {
    const ungroupSpy = jest.fn()
    ;(browser as any).tabs = {
      ungroup: ungroupSpy,
    }
    const tabs = [
      { id: 2, groupId: 99 },
      { id: 3, groupId: 99 },
      { id: 4, groupId: -1 },
    ] as any
    const store = new TabGroupStore({
      windowStore: { tabs },
    } as any)
    store.tabGroupMap = new Map([
      [
        99,
        {
          id: 99,
          windowId: 1,
          title: 'Group',
          color: 'blue',
          collapsed: false,
        },
      ],
    ])

    await store.ungroup(99)

    expect(ungroupSpy).toHaveBeenCalledWith([2, 3])
    expect(store.getTabGroup(99)).toBeUndefined()
  })

  it('should group tabs into an existing tab group', async () => {
    const store = groupStore()
    const result = await store.groupTabs([1, 2], 55)

    expect((browser as any).tabs.group).toHaveBeenCalledWith({
      tabIds: [1, 2],
      groupId: 55,
    })
    expect(result).toBe(123)
  })

  it('should create a new tab group from tabs', async () => {
    const store = groupStore()
    const result = await store.createGroup([10, 11])

    expect((browser as any).tabs.group).toHaveBeenCalledWith({
      tabIds: [10, 11],
      createProperties: undefined,
    })
    expect(result).toBe(123)
  })

  it('should refuse to create a group from tabs in different windows', async () => {
    const store = new TabGroupStore({
      windowStore: {
        tabs: [
          { id: 10, windowId: 1 },
          { id: 11, windowId: 2 },
        ],
      },
    } as any)

    const result = await store.createGroup([10, 11])

    expect((browser as any).tabs.group).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('should add tabs to an existing tab group', async () => {
    const store = groupStore()
    await store.addTabsToGroup([22, 23], 8)

    expect((browser as any).tabs.group).toHaveBeenCalledWith({
      tabIds: [22, 23],
      groupId: 8,
    })
  })

  it('should move tab group with browser.tabGroups.move', async () => {
    const store = groupStore()
    const result = await store.moveGroup(42, {
      windowId: 2,
      index: 1,
    })

    expect((browser as any).tabGroups.move).toHaveBeenCalledWith(42, {
      windowId: 2,
      index: 1,
    })
    expect(result?.id).toBe(42)
  })

  it('should ungroup one tab only with ungroupTab', async () => {
    const store = new TabGroupStore({
      windowStore: {
        tabs: [
          { id: 2, groupId: 99 },
          { id: 3, groupId: 99 },
        ],
      },
    } as any)
    await store.ungroupTab(2)

    expect((browser as any).tabs.ungroup).toHaveBeenCalledWith([2])
  })
})
