import DragStore from 'stores/DragStore'
import TabStore from 'stores/TabStore'

const tab = (id: number, windowId: number, index: number, groupId = -1) => ({
  id,
  windowId,
  index,
  groupId,
  pinned: false,
})

const setup = (sources: any[], targetTabs: any[] = []) => {
  const destination = { id: 7, canDrop: true, tabs: targetTabs }
  const windowStore = {
    getTargetWindow: jest.fn(() => destination),
    moveTabs: jest.fn().mockResolvedValue(undefined),
    suspend: jest.fn(),
    resume: jest.fn().mockResolvedValue(undefined),
    markLayoutDirtyIfNeeded: jest.fn(),
  }
  const tabGroupStore = {
    getNoGroupId: () => -1,
    hasTabGroupsApi: () => true,
    canMutateGroups: () => true,
    canMoveGroups: () => true,
    getTabsForGroup: jest.fn((groupId: number) =>
      sources.filter((source) => source.groupId === groupId),
    ),
    moveGroup: jest.fn().mockResolvedValue(undefined),
    ungroupTabs: jest.fn().mockResolvedValue(undefined),
    groupTabs: jest.fn().mockResolvedValue(undefined),
  }
  const store = { windowStore, tabGroupStore } as any
  store.tabStore = new TabStore(store)
  store.tabStore.selectAll(sources)
  const dragStore = new DragStore(store)
  dragStore.getWindowTabsFromBrowser = jest.fn().mockResolvedValue(targetTabs)
  return {
    dragStore,
    tabStore: store.tabStore as TabStore,
    windowStore,
    tabGroupStore,
    destination,
  }
}

describe('DragStore window edge moves', () => {
  it.each([
    ['beginning', 0],
    ['end', -1],
  ] as const)(
    'moves selected tabs to %s in window/index order without starting a drag',
    async (position, index) => {
      const first = tab(1, 1, 0)
      const second = tab(2, 1, 3)
      const third = tab(3, 2, 0)
      const { dragStore, tabStore, windowStore } = setup(
        [third, second, first],
        [tab(9, 7, 0)],
      )

      await dragStore.moveSelectedTabsToWindowEdge(7, position)

      expect(windowStore.moveTabs).toHaveBeenCalledWith(
        [first, second, third],
        7,
        index,
      )
      expect(tabStore.selection.size).toBe(0)
      expect(dragStore.dragging).toBe(false)
      expect(windowStore.markLayoutDirtyIfNeeded).toHaveBeenCalledWith(
        'drag-drop',
      )
      expect(windowStore.resume).toHaveBeenCalledWith({
        repackPolicy: 'never',
        reason: 'drag-drop',
      })
    },
  )

  it('appends nonadjacent same-window selections using all tabs, including hidden rows', async () => {
    const tabs = Array.from({ length: 6 }, (_, index) =>
      tab(index + 1, 7, index),
    )
    const { dragStore, windowStore } = setup([tabs[1], tabs[3]], tabs)

    await dragStore.moveSelectedTabsToWindowEdge(7, 'end')

    expect(windowStore.moveTabs).toHaveBeenCalledWith([tabs[1], tabs[3]], 7, -1)
  })

  it.each([['empty'], ['unsupported']] as const)(
    'ignores %s moves and keeps selection',
    async (scenario) => {
      const { dragStore, tabStore, destination, windowStore } = setup(
        scenario === 'empty' ? [] : [tab(1, 1, 0)],
      )
      destination.canDrop = scenario !== 'unsupported'
      await dragStore.moveSelectedTabsToWindowEdge(7, 'end')

      expect(windowStore.suspend).not.toHaveBeenCalled()
      expect(windowStore.moveTabs).not.toHaveBeenCalled()
      expect(tabStore.selection.size).toBe(scenario === 'empty' ? 0 : 1)
    },
  )

  it('retains selection and resumes updates after a failed move', async () => {
    const { dragStore, tabStore, windowStore } = setup([tab(1, 1, 0)])
    windowStore.moveTabs.mockRejectedValue(new Error('Move failed'))

    await dragStore.moveSelectedTabsToWindowEdge(7, 'end')

    expect(tabStore.selection.size).toBe(1)
    expect(dragStore.dropped).toBe(false)
    expect(windowStore.resume).toHaveBeenCalledTimes(1)
    expect(windowStore.markLayoutDirtyIfNeeded).not.toHaveBeenCalled()
  })

  it.each(['tab', 'group'] as const)(
    'retains the %s drag selection when the browser move fails after drag end',
    async (source) => {
      const selected = {
        ...tab(1, 1, 0, source === 'group' ? 10 : -1),
        unhover: jest.fn(),
      }
      const { dragStore, tabStore, windowStore, tabGroupStore } = setup([
        selected,
      ])
      let rejectMove: (error: Error) => void
      const pending = new Promise<void>((_, reject) => {
        rejectMove = reject
      })
      const move =
        source === 'group' ? tabGroupStore.moveGroup : windowStore.moveTabs
      move.mockReturnValue(pending)
      if (source === 'group') {
        dragStore.dragStartGroup(10)
      } else {
        dragStore.dragStartTab(selected as any)
      }

      const result = dragStore.moveSelectedTabsToWindowEdge(7, 'end')
      dragStore.dragEnd()

      expect(dragStore.dragging).toBe(false)
      expect(dragStore.pendingWindowEdgeDrop).toBe(true)
      expect(tabStore.selection.has(1)).toBe(true)
      rejectMove(new Error('Move failed after drag end'))
      await result

      expect(tabStore.selection.has(1)).toBe(true)
      expect(dragStore.pendingWindowEdgeDrop).toBe(false)
      expect(dragStore.dropped).toBe(false)
      expect(windowStore.resume).toHaveBeenCalledTimes(1)
      expect(windowStore.markLayoutDirtyIfNeeded).not.toHaveBeenCalled()
    },
  )

  it('clears selection only after a successful pending drop and prevents overlapping edge moves', async () => {
    const selected = { ...tab(1, 1, 0), unhover: jest.fn() }
    const { dragStore, tabStore, windowStore } = setup([selected])
    let finishMove: () => void
    const pending = new Promise<void>((resolve) => {
      finishMove = resolve
    })
    windowStore.moveTabs.mockReturnValue(pending)
    dragStore.dragStartTab(selected as any)

    const result = dragStore.moveSelectedTabsToWindowEdge(7, 'end')
    dragStore.dragEnd()
    await dragStore.moveSelectedTabsToWindowEdge(7, 'beginning')
    expect(
      dragStore.dragStartTab({ ...tab(2, 2, 0), unhover: jest.fn() } as any),
    ).toBeNull()
    expect(dragStore.dragStartGroup(10)).toBeNull()
    expect(tabStore.selection.has(1)).toBe(true)
    expect(windowStore.moveTabs).toHaveBeenCalledTimes(1)

    finishMove()
    await result

    expect(tabStore.selection.size).toBe(0)
    expect(dragStore.pendingWindowEdgeDrop).toBe(false)
    expect(dragStore.dropped).toBe(true)
  })

  it('still clears selection when a drag is cancelled without a drop', () => {
    const selected = { ...tab(1, 1, 0), unhover: jest.fn() }
    const { dragStore, tabStore } = setup([selected])
    dragStore.dragStartTab(selected as any)
    dragStore.dragEnd()

    expect(dragStore.dragging).toBe(false)
    expect(tabStore.selection.size).toBe(0)
  })

  it.each([
    ['beginning', 1],
    ['end', -1],
  ] as const)(
    'preserves an entire group at %s and respects destination pins',
    async (position, index) => {
      const group = [tab(1, 1, 0, 10), tab(2, 1, 1, 10)]
      const { dragStore, tabGroupStore, windowStore } = setup(group, [
        { ...tab(9, 7, 0), pinned: true },
        tab(8, 7, 1),
      ])

      await dragStore.moveSelectedTabsToWindowEdge(7, position)

      expect(tabGroupStore.moveGroup).toHaveBeenCalledWith(10, {
        windowId: 7,
        index,
      })
      expect(tabGroupStore.ungroupTabs).not.toHaveBeenCalled()
      expect(windowStore.moveTabs).not.toHaveBeenCalled()
    },
  )

  it('ungroups only the selected fragment before moving to the edge', async () => {
    const fragment = tab(1, 1, 0, 10)
    const sibling = tab(2, 1, 1, 10)
    const { dragStore, tabGroupStore, windowStore } = setup([fragment])
    tabGroupStore.getTabsForGroup.mockReturnValue([fragment, sibling])

    await dragStore.moveSelectedTabsToWindowEdge(7, 'end')

    expect(tabGroupStore.ungroupTabs).toHaveBeenCalledWith([1])
    expect(windowStore.moveTabs).toHaveBeenCalledWith([fragment], 7, -1)
    expect(tabGroupStore.groupTabs).not.toHaveBeenCalled()
  })

  it('appends each group and loose-tab block without incrementing the append sentinel', async () => {
    const first = tab(1, 1, 0)
    const group = [tab(2, 1, 1, 10), tab(3, 1, 2, 10)]
    const last = tab(4, 1, 3)
    const { dragStore, tabGroupStore, windowStore } = setup([
      first,
      ...group,
      last,
    ])

    await dragStore.moveSelectedTabsToWindowEdge(7, 'end')

    expect(windowStore.moveTabs).toHaveBeenNthCalledWith(1, [first], 7, -1)
    expect(tabGroupStore.moveGroup).toHaveBeenCalledWith(10, {
      windowId: 7,
      index: -1,
    })
    expect(windowStore.moveTabs).toHaveBeenNthCalledWith(2, [last], 7, -1)
    expect(windowStore.moveTabs.mock.invocationCallOrder[0]).toBeLessThan(
      tabGroupStore.moveGroup.mock.invocationCallOrder[0],
    )
    expect(tabGroupStore.moveGroup.mock.invocationCallOrder[0]).toBeLessThan(
      windowStore.moveTabs.mock.invocationCallOrder[1],
    )
  })

  it('prepends mixed blocks in reverse order around destination pins', async () => {
    const first = tab(1, 1, 0)
    const group = [tab(2, 1, 1, 10), tab(3, 1, 2, 10)]
    const last = tab(4, 1, 3)
    const { dragStore, tabGroupStore, windowStore } = setup(
      [first, ...group, last],
      [{ ...tab(9, 7, 0), pinned: true }],
    )

    await dragStore.moveSelectedTabsToWindowEdge(7, 'beginning')

    expect(windowStore.moveTabs).toHaveBeenNthCalledWith(1, [last], 7, 0)
    expect(tabGroupStore.moveGroup).toHaveBeenCalledWith(10, {
      windowId: 7,
      index: 1,
    })
    expect(windowStore.moveTabs).toHaveBeenNthCalledWith(2, [first], 7, 0)
  })

  it('preserves multiple whole groups when reordering within the destination window', async () => {
    const firstGroup = [tab(1, 7, 0, 10), tab(2, 7, 1, 10)]
    const secondGroup = [tab(4, 7, 3, 20), tab(5, 7, 4, 20)]
    const { dragStore, tabGroupStore, windowStore } = setup(
      [...firstGroup, ...secondGroup],
      [...firstGroup, tab(3, 7, 2), ...secondGroup],
    )

    await dragStore.moveSelectedTabsToWindowEdge(7, 'end')

    expect(tabGroupStore.moveGroup).toHaveBeenNthCalledWith(1, 10, {
      windowId: 7,
      index: -1,
    })
    expect(tabGroupStore.moveGroup).toHaveBeenNthCalledWith(2, 20, {
      windowId: 7,
      index: -1,
    })
    expect(windowStore.moveTabs).not.toHaveBeenCalled()
  })
})
