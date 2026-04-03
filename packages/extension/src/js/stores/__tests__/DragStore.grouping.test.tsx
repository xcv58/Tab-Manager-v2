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

const setupDragStore = ({
  selection,
  tabGroupStore,
  targetTabs,
  moveTabs = jest.fn(() => Promise.resolve()),
}: {
  selection: Map<number, any>
  tabGroupStore: Record<string, any>
  targetTabs: any[]
  moveTabs?: jest.Mock
}) => {
  const tabStore = setupTabStore(selection)
  const windowStore = {
    suspend: jest.fn(),
    resume: jest.fn(),
    markLayoutDirtyIfNeeded: jest.fn(),
    moveTabs,
    getTargetWindow: jest.fn(() => ({
      tabs: targetTabs,
    })),
  }
  return new DragStore({
    tabStore,
    tabGroupStore,
    windowStore,
  } as any)
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

  it('group header before-zone keeps a whole selected group separate', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const sourceTab1 = { id: 1, groupId: 10, windowId: 1, index: 0 }
    const sourceTab2 = { id: 2, groupId: 10, windowId: 1, index: 1 }
    const targetTab1 = { id: 3, groupId: 20, windowId: 1, index: 2 }
    const targetTab2 = { id: 4, groupId: 20, windowId: 1, index: 3 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn((groupId: number) => {
          if (groupId === 10) {
            return [sourceTab1, sourceTab2]
          }
          return [targetTab1, targetTab2]
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
          tabs: [sourceTab1, sourceTab2, targetTab1, targetTab2],
        })),
      },
    } as any)
    dragStore.getWindowTabsFromBrowser = jest
      .fn()
      .mockResolvedValue([sourceTab1, sourceTab2, targetTab1, targetTab2])

    dragStore.dragStartGroup(10)
    await dragStore.dropAt({
      windowId: 1,
      index: 2,
      source: 'group-header',
    })

    expect(moveGroup).toHaveBeenCalledWith(10, {
      windowId: 1,
      index: 0,
    })
    expect(groupTabs).not.toHaveBeenCalled()
    expect(moveTabs).not.toHaveBeenCalled()
  })

  it('group header center merges the entire selected group into the target group', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const sourceTab1 = { id: 1, groupId: 10, windowId: 1, index: 0 }
    const sourceTab2 = { id: 2, groupId: 10, windowId: 1, index: 1 }
    const targetTab1 = { id: 3, groupId: 20, windowId: 1, index: 2 }
    const targetTab2 = { id: 4, groupId: 20, windowId: 1, index: 3 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn((groupId: number) => {
          if (groupId === 10) {
            return [sourceTab1, sourceTab2]
          }
          return [targetTab1, targetTab2]
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
          tabs: [sourceTab1, sourceTab2, targetTab1, targetTab2],
        })),
      },
    } as any)
    dragStore.getWindowTabsFromBrowser = jest
      .fn()
      .mockResolvedValue([sourceTab1, sourceTab2, targetTab1, targetTab2])

    dragStore.dragStartGroup(10)
    await dragStore.dropAt({
      windowId: 1,
      index: 2,
      targetGroupId: 20,
      before: true,
      source: 'group-header',
    })

    expect(moveGroup).not.toHaveBeenCalled()
    expect(groupTabs).toHaveBeenCalledWith([1, 2, 3, 4], 20)
    expect(moveTabs).not.toHaveBeenCalled()
  })

  it('manually selected whole group merges into the target group from a tab-row drag', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const sourceTab1 = { id: 1, groupId: 10, windowId: 1, index: 0 }
    const sourceTab2 = { id: 2, groupId: 10, windowId: 1, index: 1 }
    const targetTab1 = { id: 3, groupId: 20, windowId: 1, index: 2 }
    const targetTab2 = { id: 4, groupId: 20, windowId: 1, index: 3 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn((groupId: number) => {
          if (groupId === 10) {
            return [sourceTab1, sourceTab2]
          }
          return [targetTab1, targetTab2]
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
          tabs: [sourceTab1, sourceTab2, targetTab1, targetTab2],
        })),
      },
    } as any)
    dragStore.getWindowTabsFromBrowser = jest
      .fn()
      .mockResolvedValue([sourceTab1, sourceTab2, targetTab1, targetTab2])

    dragStore.dragStartTab({ ...sourceTab1, unhover: jest.fn() } as any)
    selection.set(sourceTab2.id, sourceTab2 as any)

    await dragStore.dropAt({
      windowId: 1,
      index: 2,
      targetGroupId: 20,
      before: true,
      source: 'group-header',
    })

    expect(moveGroup).not.toHaveBeenCalled()
    expect(groupTabs).toHaveBeenCalledWith([1, 2, 3, 4], 20)
    expect(moveTabs).not.toHaveBeenCalled()
  })

  it('group header center merges the entire mixed selection into the target group', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const looseTab = { id: 1, groupId: -1, windowId: 1, index: 0 }
    const sourceGroupTab1 = { id: 2, groupId: 10, windowId: 1, index: 1 }
    const sourceGroupTab2 = { id: 3, groupId: 10, windowId: 1, index: 2 }
    const otherGroupTab1 = { id: 4, groupId: 30, windowId: 1, index: 3 }
    const otherGroupTab2 = { id: 5, groupId: 30, windowId: 1, index: 4 }
    const targetTab1 = { id: 6, groupId: 20, windowId: 1, index: 5 }
    const targetTab2 = { id: 7, groupId: 20, windowId: 1, index: 6 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn((groupId: number) => {
          if (groupId === 10) {
            return [sourceGroupTab1, sourceGroupTab2]
          }
          if (groupId === 30) {
            return [otherGroupTab1, otherGroupTab2]
          }
          return [targetTab1, targetTab2]
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
          tabs: [
            looseTab,
            sourceGroupTab1,
            sourceGroupTab2,
            otherGroupTab1,
            otherGroupTab2,
            targetTab1,
            targetTab2,
          ],
        })),
      },
    } as any)
    dragStore.getWindowTabsFromBrowser = jest
      .fn()
      .mockResolvedValue([
        looseTab,
        sourceGroupTab1,
        sourceGroupTab2,
        otherGroupTab1,
        otherGroupTab2,
        targetTab1,
        targetTab2,
      ])

    dragStore.dragStartTab({ ...looseTab, unhover: jest.fn() } as any)
    selection.set(sourceGroupTab1.id, sourceGroupTab1 as any)
    selection.set(sourceGroupTab2.id, sourceGroupTab2 as any)
    selection.set(otherGroupTab1.id, otherGroupTab1 as any)
    selection.set(otherGroupTab2.id, otherGroupTab2 as any)

    await dragStore.dropAt({
      windowId: 1,
      index: 5,
      targetGroupId: 20,
      before: true,
      source: 'tab-row',
    })

    expect(moveGroup).not.toHaveBeenCalled()
    expect(groupTabs).toHaveBeenCalledWith(
      expect.arrayContaining([1, 2, 3, 4, 5, 6, 7]),
      20,
    )
    expect(moveTabs).not.toHaveBeenCalled()
  })

  it('grouped tab-row drop keeps whole-group-only selections separate', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const wholeGroupTab1 = { id: 1, groupId: 10, windowId: 1, index: 0 }
    const wholeGroupTab2 = { id: 2, groupId: 10, windowId: 1, index: 1 }
    const otherGroupTab1 = { id: 3, groupId: 30, windowId: 1, index: 2 }
    const otherGroupTab2 = { id: 4, groupId: 30, windowId: 1, index: 3 }
    const targetTab1 = { id: 5, groupId: 20, windowId: 1, index: 4 }
    const targetTab2 = { id: 6, groupId: 20, windowId: 1, index: 5 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn((groupId: number) => {
          if (groupId === 10) {
            return [wholeGroupTab1, wholeGroupTab2]
          }
          if (groupId === 30) {
            return [otherGroupTab1, otherGroupTab2]
          }
          return [targetTab1, targetTab2]
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
          tabs: [
            wholeGroupTab1,
            wholeGroupTab2,
            otherGroupTab1,
            otherGroupTab2,
            targetTab1,
            targetTab2,
          ],
        })),
      },
    } as any)
    dragStore.getWindowTabsFromBrowser = jest
      .fn()
      .mockResolvedValue([
        wholeGroupTab1,
        wholeGroupTab2,
        otherGroupTab1,
        otherGroupTab2,
        targetTab1,
        targetTab2,
      ])
    dragStore.dragStartTab({ ...wholeGroupTab1, unhover: jest.fn() } as any)
    selection.set(wholeGroupTab2.id, wholeGroupTab2 as any)
    selection.set(otherGroupTab1.id, otherGroupTab1 as any)
    selection.set(otherGroupTab2.id, otherGroupTab2 as any)

    await dragStore.dropAt({
      windowId: 1,
      index: 4,
      targetGroupId: 20,
      before: true,
      source: 'tab-row',
    })

    expect(moveGroup).not.toHaveBeenCalled()
    expect(groupTabs).toHaveBeenCalledWith([1, 2], 10)
    expect(groupTabs).toHaveBeenCalledWith([3, 4], 30)
    expect(groupTabs).not.toHaveBeenCalledWith(expect.any(Array), 20)
  })

  it('grouped tab-row drop resolves whole-group-only selections against the target group boundary', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const wholeGroupTab1 = { id: 1, groupId: 10, windowId: 2, index: 0 }
    const wholeGroupTab2 = { id: 2, groupId: 10, windowId: 2, index: 1 }
    const targetTab1 = { id: 3, groupId: 20, windowId: 1, index: 0 }
    const targetTab2 = { id: 4, groupId: 20, windowId: 1, index: 1 }
    const targetTab3 = { id: 5, groupId: 20, windowId: 1, index: 2 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn((groupId: number) => {
          if (groupId === 10) {
            return [wholeGroupTab1, wholeGroupTab2]
          }
          return [targetTab1, targetTab2, targetTab3]
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
          tabs: [targetTab1, targetTab2, targetTab3],
        })),
      },
    } as any)

    dragStore.dragStartGroup(10)
    await dragStore.drop(targetTab3 as any, true)

    expect(moveGroup).not.toHaveBeenCalled()
    expect(moveTabs).toHaveBeenCalledWith(
      [wholeGroupTab1, wholeGroupTab2],
      1,
      0,
    )
    expect(groupTabs).toHaveBeenCalledWith([1, 2], 10)
  })

  it('grouped tab-row drop merges loose or partial-group selections into the target group', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const looseTab = { id: 1, groupId: -1, windowId: 1, index: 0 }
    const partialGroupTab1 = { id: 2, groupId: 10, windowId: 1, index: 1 }
    const partialGroupTab2 = { id: 3, groupId: 10, windowId: 1, index: 2 }
    const targetTab1 = { id: 4, groupId: 20, windowId: 1, index: 3 }
    const targetTab2 = { id: 5, groupId: 20, windowId: 1, index: 4 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn((groupId: number) => {
          if (groupId === 10) {
            return [
              partialGroupTab1,
              partialGroupTab2,
              {
                id: 6,
                groupId: 10,
                windowId: 1,
                index: 5,
              },
            ]
          }
          return [targetTab1, targetTab2]
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
          tabs: [
            looseTab,
            partialGroupTab1,
            partialGroupTab2,
            targetTab1,
            targetTab2,
          ],
        })),
      },
    } as any)
    dragStore.getWindowTabsFromBrowser = jest
      .fn()
      .mockResolvedValue([
        looseTab,
        partialGroupTab1,
        partialGroupTab2,
        targetTab1,
        targetTab2,
      ])
    dragStore.dragStartTab({ ...looseTab, unhover: jest.fn() } as any)
    selection.set(partialGroupTab1.id, partialGroupTab1 as any)
    selection.set(partialGroupTab2.id, partialGroupTab2 as any)

    await dragStore.dropAt({
      windowId: 1,
      index: 3,
      targetGroupId: 20,
      before: true,
      source: 'tab-row',
    })

    expect(moveGroup).not.toHaveBeenCalled()
    expect(groupTabs).toHaveBeenCalledWith(
      expect.arrayContaining([1, 2, 3]),
      20,
    )
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

  it('window-zone drop preserves a whole selected group when moving to another window', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const sourceTab1 = { id: 1, groupId: 10, windowId: 2, index: 0 }
    const sourceTab2 = { id: 2, groupId: 10, windowId: 2, index: 1 }
    const targetTab = { id: 3, groupId: -1, windowId: 1, index: 0 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const ungroupTabs = jest.fn(() => Promise.resolve())
    const dragStore = setupDragStore({
      selection,
      targetTabs: [targetTab],
      moveTabs,
      tabGroupStore: {
        getTabsForGroup: jest.fn(() => [sourceTab1, sourceTab2]),
        moveGroup,
        groupTabs,
        ungroupTabs,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
    })
    dragStore.dragStartTab({ ...sourceTab1, unhover: jest.fn() } as any)
    selection.set(sourceTab2.id, sourceTab2 as any)

    await dragStore.dropAt({
      windowId: 1,
      index: 0,
      forceUngroup: true,
      source: 'window-zone',
    })

    expect(moveGroup).toHaveBeenCalledWith(10, {
      windowId: 1,
      index: 0,
    })
    expect(ungroupTabs).not.toHaveBeenCalled()
    expect(groupTabs).not.toHaveBeenCalled()
    expect(moveTabs).not.toHaveBeenCalled()
  })

  it('window-zone drop only reorders a whole selected group inside the same window', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const tab1 = { id: 1, groupId: 10, windowId: 1, index: 0 }
    const tab2 = { id: 2, groupId: 10, windowId: 1, index: 1 }
    const otherTab = { id: 3, groupId: -1, windowId: 1, index: 2 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const ungroupTabs = jest.fn(() => Promise.resolve())
    const dragStore = setupDragStore({
      selection,
      targetTabs: [tab1, tab2, otherTab],
      moveTabs,
      tabGroupStore: {
        getTabsForGroup: jest.fn(() => [tab1, tab2]),
        moveGroup,
        groupTabs,
        ungroupTabs,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
    })
    dragStore.dragStartTab({ ...tab1, unhover: jest.fn() } as any)
    selection.set(tab2.id, tab2 as any)

    await dragStore.dropAt({
      windowId: 1,
      index: 3,
      forceUngroup: true,
      source: 'window-zone',
    })

    expect(moveGroup).toHaveBeenCalledWith(10, {
      windowId: 1,
      index: 1,
    })
    expect(ungroupTabs).not.toHaveBeenCalled()
    expect(groupTabs).not.toHaveBeenCalled()
    expect(moveTabs).not.toHaveBeenCalled()
  })

  it('window-zone drop detaches a partial-group selection in the same window', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const tab1 = { id: 1, groupId: 10, windowId: 1, index: 0 }
    const tab2 = { id: 2, groupId: 10, windowId: 1, index: 1 }
    const tab3 = { id: 3, groupId: 10, windowId: 1, index: 2 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const ungroupTabs = jest.fn(() => Promise.resolve())
    const dragStore = setupDragStore({
      selection,
      targetTabs: [tab1, tab2, tab3],
      moveTabs,
      tabGroupStore: {
        getTabsForGroup: jest.fn(() => [tab1, tab2, tab3]),
        moveGroup,
        groupTabs,
        ungroupTabs,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
    })
    dragStore.dragStartTab({ ...tab1, unhover: jest.fn() } as any)
    selection.set(tab2.id, tab2 as any)

    await dragStore.dropAt({
      windowId: 1,
      index: 3,
      forceUngroup: true,
      source: 'window-zone',
    })

    expect(ungroupTabs).toHaveBeenCalledWith([1, 2])
    expect(moveTabs).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 2 })],
      1,
      1,
    )
    expect(groupTabs).not.toHaveBeenCalled()
    expect(moveGroup).not.toHaveBeenCalled()
  })

  it('window-zone drop preserves each whole group in a mixed cross-window selection', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const wholeGroupTab1 = { id: 1, groupId: 10, windowId: 2, index: 0 }
    const wholeGroupTab2 = { id: 2, groupId: 10, windowId: 2, index: 1 }
    const partialGroupTab = { id: 3, groupId: 20, windowId: 2, index: 2 }
    const partialGroupSibling = { id: 4, groupId: 20, windowId: 2, index: 3 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const ungroupTabs = jest.fn(() => Promise.resolve())
    const dragStore = setupDragStore({
      selection,
      targetTabs: [
        wholeGroupTab1,
        wholeGroupTab2,
        partialGroupTab,
        partialGroupSibling,
      ],
      moveTabs,
      tabGroupStore: {
        getTabsForGroup: jest.fn((groupId: number) => {
          if (groupId === 10) {
            return [wholeGroupTab1, wholeGroupTab2]
          }
          if (groupId === 20) {
            return [partialGroupTab, partialGroupSibling]
          }
          return []
        }),
        moveGroup,
        groupTabs,
        ungroupTabs,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
    })
    dragStore.dragStartTab({ ...wholeGroupTab1, unhover: jest.fn() } as any)
    selection.set(wholeGroupTab2.id, wholeGroupTab2 as any)
    selection.set(partialGroupTab.id, partialGroupTab as any)

    await dragStore.dropAt({
      windowId: 1,
      index: 0,
      forceUngroup: true,
      source: 'window-zone',
    })

    expect(ungroupTabs).toHaveBeenCalledWith([3])
    expect(moveTabs).toHaveBeenCalledWith(
      [
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 }),
        expect.objectContaining({ id: 3 }),
      ],
      1,
      0,
    )
    expect(groupTabs).toHaveBeenCalledWith([1, 2], 10)
    expect(moveGroup).not.toHaveBeenCalled()
  })

  it('window-zone drop preserves a whole group block and keeps loose tabs loose in a mixed cross-window selection', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const wholeGroupTab1 = { id: 1, groupId: 10, windowId: 2, index: 0 }
    const wholeGroupTab2 = { id: 2, groupId: 10, windowId: 2, index: 1 }
    const looseTab = { id: 3, groupId: -1, windowId: 2, index: 2 }
    const targetTab = { id: 4, groupId: -1, windowId: 1, index: 0 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve({ id: 10 }))
    const groupTabs = jest.fn(() => Promise.resolve())
    const ungroupTabs = jest.fn(() => Promise.resolve())
    const dragStore = setupDragStore({
      selection,
      targetTabs: [targetTab],
      moveTabs,
      tabGroupStore: {
        getTabsForGroup: jest.fn((groupId: number) => {
          if (groupId === 10) {
            return [wholeGroupTab1, wholeGroupTab2]
          }
          return []
        }),
        moveGroup,
        groupTabs,
        ungroupTabs,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => true,
      },
    })
    dragStore.dragStartTab({ ...wholeGroupTab1, unhover: jest.fn() } as any)
    selection.set(wholeGroupTab2.id, wholeGroupTab2 as any)
    selection.set(looseTab.id, looseTab as any)

    await dragStore.dropAt({
      windowId: 1,
      index: 0,
      forceUngroup: true,
      source: 'window-zone',
    })

    expect(moveGroup).toHaveBeenCalledWith(10, {
      windowId: 1,
      index: 0,
    })
    expect(moveTabs).toHaveBeenCalledWith([looseTab], 1, 2)
    expect(moveGroup.mock.invocationCallOrder[0]).toBeLessThan(
      moveTabs.mock.invocationCallOrder[0],
    )
    expect(groupTabs).not.toHaveBeenCalled()
    expect(ungroupTabs).not.toHaveBeenCalled()
  })

  it('window-zone drop preserves cross-window block order for whole groups and loose tabs', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const window1LooseTab = { id: 1, groupId: -1, windowId: 1, index: 5 }
    const window2GroupTab1 = { id: 2, groupId: 10, windowId: 2, index: 0 }
    const window2GroupTab2 = { id: 3, groupId: 10, windowId: 2, index: 1 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const moveGroup = jest.fn(() => Promise.resolve({ id: 10 }))
    const groupTabs = jest.fn(() => Promise.resolve())
    const ungroupTabs = jest.fn(() => Promise.resolve())
    const tabStore = {
      selection,
      unselectAll: jest.fn(() => selection.clear()),
      get sources() {
        return Array.from(selection.values()).sort((a: any, b: any) => {
          if (a.windowId === b.windowId) {
            return a.index - b.index
          }
          return a.windowId - b.windowId
        })
      },
    }
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn((groupId: number) => {
          if (groupId === 10) {
            return [window2GroupTab1, window2GroupTab2]
          }
          return []
        }),
        moveGroup,
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
          tabs: [],
        })),
      },
    } as any)

    dragStore.dragStartTab({ ...window1LooseTab, unhover: jest.fn() } as any)
    selection.set(window2GroupTab1.id, window2GroupTab1 as any)
    selection.set(window2GroupTab2.id, window2GroupTab2 as any)

    await dragStore.dropAt({
      windowId: 3,
      index: 0,
      forceUngroup: true,
      source: 'window-zone',
    })

    expect(moveTabs).toHaveBeenNthCalledWith(
      1,
      [expect.objectContaining({ id: 1, windowId: 1 })],
      3,
      0,
    )
    expect(moveGroup).toHaveBeenNthCalledWith(1, 10, {
      windowId: 3,
      index: 1,
    })
    expect(ungroupTabs).not.toHaveBeenCalled()
    expect(groupTabs).not.toHaveBeenCalled()
  })

  it('window-zone drop preserves a whole group without moveGroup support', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const tab1 = { id: 1, groupId: 10, windowId: 2, index: 0 }
    const tab2 = { id: 2, groupId: 10, windowId: 2, index: 1 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const ungroupTabs = jest.fn(() => Promise.resolve())
    const dragStore = setupDragStore({
      selection,
      targetTabs: [{ id: 3, groupId: -1, windowId: 1, index: 0 }],
      moveTabs,
      tabGroupStore: {
        getTabsForGroup: jest.fn(() => [tab1, tab2]),
        groupTabs,
        ungroupTabs,
        getNoGroupId: () => -1,
        hasTabGroupsApi: () => true,
        canMutateGroups: () => true,
        canMoveGroups: () => false,
      },
    })
    dragStore.dragStartTab({ ...tab1, unhover: jest.fn() } as any)
    selection.set(tab2.id, tab2 as any)

    await dragStore.dropAt({
      windowId: 1,
      index: 0,
      forceUngroup: true,
      source: 'window-zone',
    })

    expect(moveTabs).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 2 })],
      1,
      0,
    )
    expect(groupTabs).toHaveBeenCalledWith([1, 2], 10)
    expect(ungroupTabs).not.toHaveBeenCalled()
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

  it('should derive target group order from browser state when joining groups', async () => {
    process.env.TARGET_BROWSER = 'chrome'
    const selection = new Map()
    const sourceTab = { id: 1, groupId: 10, windowId: 1, index: 0 }
    const siblingSourceTab = { id: 2, groupId: 10, windowId: 1, index: 1 }
    const targetA = { id: 3, groupId: 20, windowId: 1, index: 2 }
    const targetB = { id: 4, groupId: 20, windowId: 1, index: 3 }
    const moveTabs = jest.fn(() => Promise.resolve())
    const groupTabs = jest.fn(() => Promise.resolve())
    const tabStore = setupTabStore(selection)
    const dragStore = new DragStore({
      tabStore,
      tabGroupStore: {
        getTabsForGroup: jest.fn((groupId: number) => {
          if (groupId === 10) {
            return [sourceTab, siblingSourceTab]
          }
          return [targetB, targetA]
        }),
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
          tabs: [sourceTab, siblingSourceTab, targetA, targetB],
        })),
      },
    } as any)
    dragStore.getWindowTabsFromBrowser = jest
      .fn()
      .mockResolvedValue([sourceTab, siblingSourceTab, targetA, targetB])

    dragStore.dragStartTab({
      ...sourceTab,
      unhover: jest.fn(),
    } as any)
    await dragStore.drop(targetA as any, false)

    expect(groupTabs).toHaveBeenCalledWith([3, 1, 4], 20)
    expect(moveTabs).not.toHaveBeenCalled()
  })

  it('full-group tab-row selection should preserve the selected group block', async () => {
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

    expect(moveGroup).not.toHaveBeenCalled()
    expect(moveTabs).toHaveBeenCalledWith([tab2, tab3], 1, 1)
    expect(groupTabs).toHaveBeenCalledWith([2, 3], 10)
  })

  it('full-group tab-row selection preserves the block even without moveGroup support', async () => {
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

    expect(moveGroup).not.toHaveBeenCalled()
    expect(moveTabs).toHaveBeenCalledWith([tab2, tab3], 1, 1)
    expect(groupTabs).toHaveBeenCalledWith([2, 3], 10)
  })
})
