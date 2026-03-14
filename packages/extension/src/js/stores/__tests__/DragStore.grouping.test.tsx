import DragStore from 'stores/DragStore'

const setupTabStore = (selection: Map<number, any>) => {
  return {
    selection,
    unselectAll: jest.fn(() => selection.clear()),
    get sources() {
      return Array.from(selection.values()).sort((a: any, b: any) => {
        return a.index - b.index
      })
    },
  }
}

describe('DragStore with tab groups', () => {
  const originalTargetBrowser = process.env.TARGET_BROWSER

  afterEach(() => {
    process.env.TARGET_BROWSER = originalTargetBrowser
  })

  it('dragStartTab should only select dragged grouped tab', () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const getTabsForGroup = jest.fn(() => [{ id: 1 }, { id: 2 }])
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
    } as any)
    const tab = {
      id: 1,
      groupId: 10,
      select: jest.fn(),
      unhover: jest.fn(),
    }

    const selected = dragStore.dragStartTab(tab as any)

    expect(tab.unhover).toHaveBeenCalled()
    expect(selected.size).toBe(1)
    expect(selected.has(1)).toBe(true)
    expect(getTabsForGroup).not.toHaveBeenCalled()
  })

  it('dragStartGroup should select full group block', () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map([[99, { id: 99 }]])
    const tab1 = { id: 1, groupId: 10, index: 1 }
    const tab2 = { id: 2, groupId: 10, index: 2 }
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn(() => [tab1, tab2]),
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
    } as any)

    const selected = dragStore.dragStartGroup(10)

    expect(tabStore.unselectAll).toHaveBeenCalled()
    expect(selected.size).toBe(2)
    expect(selected.has(1)).toBe(true)
    expect(selected.has(2)).toBe(true)
  })

  it('drop into grouped target should preserve before/after placement', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const tab1 = { id: 1, groupId: -1, windowId: 1, index: 0 }
    const tab2 = { id: 2, groupId: 20, windowId: 1, index: 1 }
    const tab3 = { id: 3, groupId: 20, windowId: 1, index: 2 }
    const tab4 = { id: 4, groupId: 20, windowId: 1, index: 3 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() =>
      Promise.resolve({
        id: 20,
      }),
    )
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn(() => [tab2, tab3, tab4]),
        moveGroup,
        groupTabs,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
      windowStore: {
        suspend: jest.fn(),
        resume: jest.fn(),
        markLayoutDirtyIfNeeded: jest.fn(),
        moveTabs,
        getTargetWindow: jest.fn(() => ({
          tabs: [tab1, tab2, tab3, tab4],
        })),
      },
    } as any)
    dragStore.getWindowTabsFromBrowser = jest
      .fn()
      .mockResolvedValueOnce([tab1, tab2, tab3, tab4])
      .mockResolvedValueOnce([
        tab2,
        tab3,
        tab4,
        { ...tab1, groupId: 20, windowId: 1, index: 4 },
      ])
    const draggedTab = {
      ...tab1,
      unhover: jest.fn(),
    }

    dragStore.dragStartTab(draggedTab as any)
    await dragStore.drop(tab3 as any, false)

    expect(moveTabs).toHaveBeenNthCalledWith(
      1,
      [expect.objectContaining({ id: 1 })],
      1,
      4,
    )
    expect(groupTabs).toHaveBeenCalledWith([1], 20)
    expect(moveTabs).toHaveBeenNthCalledWith(
      2,
      [expect.objectContaining({ id: 1 })],
      1,
      2,
    )
    expect(moveGroup).not.toHaveBeenCalled()
  })

  it('should apply grouped drop behavior in firefox when tab group capabilities exist', async () => {
    process.env.TARGET_BROWSER = 'firefox'
    const selection = new Map()
    const tab1 = { id: 1, groupId: -1, windowId: 1, index: 0 }
    const tab2 = { id: 2, groupId: 20, windowId: 1, index: 1 }
    const tab3 = { id: 3, groupId: 20, windowId: 1, index: 2 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn(() => [tab2, tab3]),
        groupTabs,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
      windowStore: {
        suspend: jest.fn(),
        resume: jest.fn(),
        markLayoutDirtyIfNeeded: jest.fn(),
        moveTabs,
        getTargetWindow: jest.fn(() => ({
          tabs: [tab1, tab2, tab3],
        })),
      },
    } as any)
    dragStore.getWindowTabsFromBrowser = jest
      .fn()
      .mockResolvedValueOnce([tab1, tab2, tab3])
      .mockResolvedValueOnce([
        tab2,
        tab3,
        { ...tab1, groupId: 20, windowId: 1, index: 3 },
      ])
    const draggedTab = {
      ...tab1,
      unhover: jest.fn(),
    }

    dragStore.dragStartTab(draggedTab as any)
    await dragStore.drop(tab3 as any, false)

    expect(moveTabs).toHaveBeenNthCalledWith(
      1,
      [expect.objectContaining({ id: 1 })],
      1,
      3,
    )
    expect(groupTabs).toHaveBeenCalledWith([1], 20)
    expect(moveTabs).toHaveBeenNthCalledWith(
      2,
      [expect.objectContaining({ id: 1 })],
      1,
      2,
    )
  })

  it('dropAt forceUngroup should detach only dragged grouped tab', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const tab1 = { id: 1, groupId: 10, windowId: 1, index: 1 }
    const tab2 = { id: 2, groupId: 10, windowId: 1, index: 2 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const ungroupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn(() => [tab1, tab2]),
        groupTabs,
        ungroupTabs,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
      windowStore: {
        suspend: jest.fn(),
        resume: jest.fn(),
        markLayoutDirtyIfNeeded: jest.fn(),
        moveTabs,
        getTargetWindow: jest.fn(() => ({
          tabs: [tab1, tab2],
        })),
      },
    } as any)
    const draggedTab = {
      ...tab1,
      unhover: jest.fn(),
    }

    dragStore.dragStartTab(draggedTab as any)
    await dragStore.dropAt({
      windowId: 1,
      index: 0,
      forceUngroup: true,
      source: 'window-zone',
    })

    expect(ungroupTabs).toHaveBeenCalledWith([1])
    expect(moveTabs).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 1 })],
      1,
      0,
    )
    expect(groupTabs).not.toHaveBeenCalled()
  })

  it('dropAt from group header should insert at start of target group', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const tab1 = { id: 1, groupId: -1, windowId: 1, index: 0 }
    const tab2 = { id: 2, groupId: 20, windowId: 1, index: 1 }
    const tab3 = { id: 3, groupId: 20, windowId: 1, index: 2 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn(() => [tab2, tab3]),
        groupTabs,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
      windowStore: {
        suspend: jest.fn(),
        resume: jest.fn(),
        markLayoutDirtyIfNeeded: jest.fn(),
        moveTabs,
        getTargetWindow: jest.fn(() => ({
          tabs: [tab1, tab2, tab3],
        })),
      },
    } as any)
    dragStore.getWindowTabsFromBrowser = jest
      .fn()
      .mockResolvedValueOnce([tab1, tab2, tab3])
      .mockResolvedValueOnce([
        tab2,
        tab3,
        { ...tab1, groupId: 20, windowId: 1, index: 3 },
      ])
    const draggedTab = {
      ...tab1,
      unhover: jest.fn(),
    }

    dragStore.dragStartTab(draggedTab as any)
    await dragStore.dropAt({
      windowId: 1,
      index: 99,
      targetGroupId: 20,
      before: true,
      source: 'group-header',
    })

    expect(moveTabs).toHaveBeenNthCalledWith(
      1,
      [expect.objectContaining({ id: 1 })],
      1,
      3,
    )
    expect(groupTabs).toHaveBeenCalledWith([1], 20)
    expect(moveTabs).toHaveBeenNthCalledWith(
      2,
      [expect.objectContaining({ id: 1 })],
      1,
      0,
    )
  })

  it('drop into grouped target from another window should stage after group before joining', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const sourceTab = { id: 1, groupId: -1, windowId: 2, index: 0 }
    const tab2 = { id: 2, groupId: 20, windowId: 1, index: 1 }
    const tab3 = { id: 3, groupId: 20, windowId: 1, index: 2 }
    const tab4 = { id: 4, groupId: 20, windowId: 1, index: 3 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn(() => [tab2, tab3, tab4]),
        groupTabs,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
      windowStore: {
        suspend: jest.fn(),
        resume: jest.fn(),
        markLayoutDirtyIfNeeded: jest.fn(),
        moveTabs,
        getTargetWindow: jest.fn(() => ({
          tabs: [tab2, tab3, tab4],
        })),
      },
    } as any)
    dragStore.getWindowTabsFromBrowser = jest
      .fn()
      .mockResolvedValueOnce([tab2, tab3, tab4])
      .mockResolvedValueOnce([
        tab2,
        tab3,
        tab4,
        { ...sourceTab, groupId: 20, windowId: 1, index: 4 },
      ])

    dragStore.dragStartTab({
      ...sourceTab,
      unhover: jest.fn(),
    } as any)
    await dragStore.drop(tab3 as any, false)

    expect(moveTabs).toHaveBeenNthCalledWith(
      1,
      [expect.objectContaining({ id: 1 })],
      1,
      3,
    )
    expect(groupTabs).toHaveBeenCalledWith([1], 20)
    expect(moveTabs).toHaveBeenNthCalledWith(
      2,
      [expect.objectContaining({ id: 1 })],
      1,
      2,
    )
  })

  it('full-group selection should use moveGroup fast path', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const tab1 = { id: 1, groupId: -1, windowId: 1, index: 0 }
    const tab2 = { id: 2, groupId: 10, windowId: 1, index: 1 }
    const tab3 = { id: 3, groupId: 10, windowId: 1, index: 2 }
    const tab4 = { id: 4, groupId: 20, windowId: 1, index: 3 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() =>
      Promise.resolve({
        id: 10,
      }),
    )
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn((groupId: number) => {
          if (groupId === 10) {
            return [tab2, tab3]
          }
          return [tab4]
        }),
        moveGroup,
        groupTabs,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
      windowStore: {
        suspend: jest.fn(),
        resume: jest.fn(),
        markLayoutDirtyIfNeeded: jest.fn(),
        moveTabs,
        getTargetWindow: jest.fn(() => ({
          tabs: [tab1, tab2, tab3, tab4],
        })),
      },
    } as any)

    dragStore.dragStartGroup(10)
    await dragStore.drop(tab4 as any, true)

    expect(moveGroup).toHaveBeenCalledWith(10, {
      windowId: 1,
      index: 1,
    })
    expect(moveTabs).not.toHaveBeenCalled()
    expect(groupTabs).not.toHaveBeenCalled()
  })

  it('full-group selection should not fallback when moveGroup resolves null', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const tab1 = { id: 1, groupId: -1, windowId: 1, index: 0 }
    const tab2 = { id: 2, groupId: 10, windowId: 1, index: 1 }
    const tab3 = { id: 3, groupId: 10, windowId: 1, index: 2 }
    const tab4 = { id: 4, groupId: 20, windowId: 1, index: 3 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve(null))
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn((groupId: number) => {
          if (groupId === 10) {
            return [tab2, tab3]
          }
          return [tab4]
        }),
        moveGroup,
        groupTabs,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
      windowStore: {
        suspend: jest.fn(),
        resume: jest.fn(),
        markLayoutDirtyIfNeeded: jest.fn(),
        moveTabs,
        getTargetWindow: jest.fn(() => ({
          tabs: [tab1, tab2, tab3, tab4],
        })),
      },
    } as any)

    dragStore.dragStartGroup(10)
    await dragStore.drop(tab4 as any, true)

    expect(moveGroup).toHaveBeenCalledWith(10, {
      windowId: 1,
      index: 1,
    })
    expect(moveTabs).not.toHaveBeenCalled()
    expect(groupTabs).not.toHaveBeenCalled()
  })
})
