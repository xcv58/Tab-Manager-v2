const mockTabsUpdate = jest.fn<Promise<any>, any[]>(async () => undefined)
const mockTabsMove = jest.fn<Promise<any>, any[]>(async () => undefined)
const mockTabsGet = jest.fn()
const mockTabsQuery = jest.fn()
const mockTabsGroup = jest.fn()
const mockTabsUngroup = jest.fn()
const mockTabGroupsGet = jest.fn()
const mockTabGroupsUpdate = jest.fn()
const mockWindowsCreate = jest.fn()
const mockWindowsUpdate = jest.fn()

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    runtime: {
      getURL: jest.fn((path: string) => `chrome-extension://test/${path}`),
    },
    storage: {
      local: {
        get: jest.fn(),
        set: jest.fn(),
      },
      sync: {
        get: jest.fn(),
        set: jest.fn(),
      },
    },
    tabs: {
      get: mockTabsGet,
      update: mockTabsUpdate,
      move: mockTabsMove,
      query: mockTabsQuery,
      group: mockTabsGroup,
      ungroup: mockTabsUngroup,
    },
    tabGroups: {
      get: mockTabGroupsGet,
      update: mockTabGroupsUpdate,
      TAB_GROUP_ID_NONE: -1,
    },
    windows: {
      create: mockWindowsCreate,
      update: mockWindowsUpdate,
    },
  },
}))

import { ItemTypes, createWindow, moveTabs } from 'libs'

const makeTab = (
  id: number,
  windowId: number,
  index: number,
  groupId = -1,
) => ({
  id,
  windowId,
  index,
  groupId,
  pinned: false,
})

describe('ItemTypes', () => {
  beforeEach(() => {
    mockTabsGet.mockReset()
    mockTabsUpdate.mockReset().mockResolvedValue(undefined)
    mockTabsMove.mockReset().mockResolvedValue(undefined)
    mockTabsQuery.mockReset()
    mockTabsGroup.mockReset()
    mockTabsUngroup.mockReset()
    mockTabGroupsGet.mockReset()
    mockTabGroupsUpdate.mockReset()
    mockWindowsCreate.mockReset()
    mockWindowsUpdate.mockClear()

    mockWindowsCreate.mockResolvedValue({ id: 99 })
    mockWindowsUpdate.mockResolvedValue(undefined)
    mockTabsGet.mockResolvedValue(null)
    mockTabsQuery.mockResolvedValue([])
    mockTabsGroup.mockResolvedValue(70)
    mockTabsUngroup.mockResolvedValue(undefined)
    mockTabGroupsGet.mockResolvedValue(null)
    mockTabGroupsUpdate.mockResolvedValue(null)
  })

  it('has tab type', () => {
    expect(ItemTypes.TAB).toBeTruthy()
  })

  it('pins tabs before moving them', async () => {
    await moveTabs([{ id: 1, pinned: true }], 9, 0)

    expect(mockTabsUpdate).toHaveBeenNthCalledWith(1, 1, { pinned: true })
    expect(mockTabsMove).toHaveBeenNthCalledWith(1, 1, {
      windowId: 9,
      index: 0,
    })
    expect(mockTabsUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      mockTabsMove.mock.invocationCallOrder[0],
    )
  })

  const simulateBrowser = (
    initialTabs: Array<
      ReturnType<typeof makeTab> & { active?: boolean; discarded?: boolean }
    >,
    unpinTransfers = false,
    appendTransferredPins = false,
  ) => {
    const windows = new Map<number, any[]>()
    initialTabs.forEach((tab) => {
      const list = windows.get(tab.windowId) || []
      list.push({ pinned: false, discarded: false, active: false, ...tab })
      windows.set(tab.windowId, list)
    })
    windows.forEach((list) => list.sort((a, b) => a.index - b.index))
    const getTab = (id: number) => {
      for (const [windowId, list] of windows) {
        const index = list.findIndex((tab) => tab.id === id)
        if (index !== -1) {
          return { ...list[index], windowId, index }
        }
      }
      throw new Error(`Missing tab ${id}`)
    }
    const reloaded: number[] = []
    mockTabsGet.mockImplementation(async (id) => getTab(id))
    mockTabsQuery.mockImplementation(async ({ windowId }) =>
      (windows.get(windowId) || []).map((tab) => getTab(tab.id)),
    )
    mockTabsUpdate.mockImplementation(async (id, { pinned }) => {
      const current = getTab(id)
      const list = windows.get(current.windowId)
      const tab = list[current.index]
      if (typeof pinned === 'boolean' && pinned !== tab.pinned) {
        list.splice(current.index, 1)
        tab.pinned = pinned
        list.splice(list.filter((item) => item.pinned).length, 0, tab)
      }
      return getTab(id)
    })
    mockTabsMove.mockImplementation(async (id, { windowId, index }) => {
      const current = getTab(id)
      const source = windows.get(current.windowId)
      const [tab] = source.splice(current.index, 1)
      if (current.windowId !== windowId && tab.active && source.length) {
        const successor = source[Math.min(current.index, source.length - 1)]
        successor.active = true
        if (successor.discarded) {
          successor.discarded = false
          reloaded.push(successor.id)
        }
      }
      if (current.windowId !== windowId) {
        tab.active = false
        if (unpinTransfers) {
          tab.pinned = false
        }
      }
      const target = windows.get(windowId) || []
      windows.set(windowId, target)
      const position =
        appendTransferredPins && current.windowId !== windowId && tab.pinned
          ? target.filter((item) => item.pinned).length
          : index === -1
            ? target.length
            : index
      target.splice(position, 0, tab)
      return getTab(id)
    })
    return { getTab, windows, reloaded }
  }

  it.each([0, -1])(
    'preserves discarded successors and final order when inserting at %s',
    async (from) => {
      const initial = [
        { ...makeTab(1, 1, 0), active: true },
        { ...makeTab(2, 1, 1), discarded: true },
        { ...makeTab(3, 1, 2), discarded: true },
        { ...makeTab(99, 9, 0), active: true },
      ]
      const model = simulateBrowser(initial)
      // A suspended store may still have stale active flags.
      await moveTabs(
        initial.slice(0, 3).map((tab) => ({ ...tab, active: false })),
        9,
        from,
      )

      expect(model.reloaded).toEqual([])
      expect(model.getTab(2).discarded).toBe(true)
      expect(model.getTab(3).discarded).toBe(true)
      expect(model.windows.get(9).map((tab) => tab.id)).toEqual(
        from === -1 ? [99, 1, 2, 3] : [1, 2, 3, 99],
      )
      expect(model.getTab(99).active).toBe(true)
      expect(
        mockTabsMove.mock.calls[mockTabsMove.mock.calls.length - 1][0],
      ).toBe(1)
    },
  )

  it('moves active tabs last across multiple source windows and a selected destination tab', async () => {
    const initial = [
      { ...makeTab(1, 1, 0), active: true },
      { ...makeTab(2, 1, 1), discarded: true },
      { ...makeTab(3, 2, 0), active: true },
      { ...makeTab(4, 2, 1), discarded: true },
      { ...makeTab(99, 9, 0), active: true },
      makeTab(100, 9, 1),
    ]
    const model = simulateBrowser(initial)
    await moveTabs(
      [initial[0], initial[1], initial[4], initial[2], initial[3]],
      9,
      0,
    )

    expect(model.reloaded).toEqual([])
    expect(model.windows.get(9).map((tab) => tab.id)).toEqual([
      1, 2, 99, 3, 4, 100,
    ])
    expect(model.getTab(99).active).toBe(true)
    const calls = mockTabsMove.mock.calls.map(([id]) => id)
    expect(calls.indexOf(1)).toBeGreaterThan(calls.indexOf(2))
    expect(calls.indexOf(3)).toBeGreaterThan(calls.indexOf(4))
  })

  it('restores transferred pinning without changing the requested pinned order', async () => {
    const initial = [
      { ...makeTab(1, 1, 0), pinned: true, active: true },
      { ...makeTab(2, 1, 1), pinned: true, discarded: true },
      { ...makeTab(3, 1, 2), discarded: true },
      { ...makeTab(99, 9, 0), pinned: true, active: true },
      makeTab(100, 9, 1),
    ]
    const model = simulateBrowser(initial, true)
    await moveTabs(initial.slice(0, 3), 9, 0)

    expect(model.reloaded).toEqual([])
    expect(model.getTab(1).pinned).toBe(true)
    expect(model.getTab(2).pinned).toBe(true)
    expect(model.windows.get(9).map((tab) => tab.id)).toEqual([
      1, 2, 99, 3, 100,
    ])
  })

  it('keeps consecutive unpinned tabs in order after a destination pin shifts the insertion boundary', async () => {
    const initial = [
      { ...makeTab(1, 1, 0), pinned: true, active: true },
      { ...makeTab(2, 1, 1), discarded: true },
      { ...makeTab(3, 1, 2), discarded: true },
      { ...makeTab(99, 9, 0), pinned: true, active: true },
      makeTab(100, 9, 1),
    ]
    const model = simulateBrowser(initial)
    await moveTabs(initial.slice(0, 3), 9, 0)
    expect(model.reloaded).toEqual([])
    expect(model.windows.get(9).map((tab) => tab.id)).toEqual([
      1, 99, 2, 3, 100,
    ])
  })

  it('corrects transferred pinned order when the browser appends pins instead of honoring the index', async () => {
    const initial = [
      { ...makeTab(1, 1, 0), pinned: true, active: true },
      { ...makeTab(2, 1, 1), pinned: true, discarded: true },
      { ...makeTab(3, 1, 2), discarded: true },
      { ...makeTab(99, 9, 0), pinned: true, active: true },
      makeTab(100, 9, 1),
    ]
    const model = simulateBrowser(initial, false, true)
    await moveTabs(initial.slice(0, 3), 9, 0)
    expect(model.reloaded).toEqual([])
    expect(model.windows.get(9).map((tab) => tab.id)).toEqual([
      1, 2, 99, 3, 100,
    ])
    expect(model.getTab(1).pinned).toBe(true)
    expect(model.getTab(2).pinned).toBe(true)
  })

  it('keeps forward same-window reorders and intentional pin changes', async () => {
    const initial = [
      { ...makeTab(1, 9, 0), active: true },
      makeTab(2, 9, 1),
      makeTab(3, 9, 2),
    ]
    const model = simulateBrowser(initial)
    await moveTabs(
      [
        { ...initial[2], pinned: true },
        { ...initial[0], pinned: true },
      ],
      9,
      0,
    )

    expect(mockTabsMove.mock.calls.map(([id]) => id)).toEqual([3, 1])
    expect(model.windows.get(9).map((tab) => tab.id)).toEqual([3, 1, 2])
    expect(model.getTab(3).pinned).toBe(true)
    expect(model.getTab(1).pinned).toBe(true)
  })

  it('moves a fully-selected tab group into a fresh window without ungrouping it', async () => {
    const tabs = [
      { id: 1, pinned: false },
      { id: 2, pinned: false },
    ]
    mockTabsGet.mockImplementation(async (id: number) => {
      if (id === 1) {
        return makeTab(1, 1, 0, 10)
      }
      if (id === 2) {
        return makeTab(2, 1, 1, 10)
      }
      return null
    })
    mockTabsQuery.mockResolvedValue([
      makeTab(1, 1, 0, 10),
      makeTab(2, 1, 1, 10),
    ])
    mockTabGroupsGet.mockResolvedValue({
      id: 10,
      title: 'Team',
      color: 'blue',
      collapsed: true,
      windowId: 1,
    })
    mockTabsGroup.mockResolvedValueOnce(71)

    await createWindow(tabs as any)

    expect(mockWindowsCreate).toHaveBeenCalledWith({ tabId: 1 })
    expect(mockTabsMove).toHaveBeenNthCalledWith(1, 2, {
      windowId: 99,
      index: -1,
    })
    expect(mockTabsUngroup).not.toHaveBeenCalled()
    expect(mockTabsGroup).toHaveBeenCalledWith({
      tabIds: [1, 2],
    })
    expect(mockTabGroupsUpdate).toHaveBeenCalledWith(71, {
      title: 'Team',
      color: 'blue',
      collapsed: true,
    })
  })

  it('recreates grouped selections when mixed with ungrouped tabs in a new window', async () => {
    const tabs = [
      { id: 1, pinned: false },
      { id: 2, pinned: false },
      { id: 3, pinned: false },
      { id: 4, pinned: false },
      { id: 5, pinned: false },
    ]
    mockTabsGet.mockImplementation(async (id: number) => {
      if (id === 1) {
        return makeTab(1, 1, 0, -1)
      }
      if (id === 2) {
        return makeTab(2, 1, 1, 10)
      }
      if (id === 3) {
        return makeTab(3, 1, 2, 10)
      }
      if (id === 4) {
        return makeTab(4, 1, 3, 20)
      }
      if (id === 5) {
        return makeTab(5, 1, 4, -1)
      }
      return null
    })
    mockTabsQuery.mockResolvedValue([
      makeTab(1, 1, 0, -1),
      makeTab(2, 1, 1, 10),
      makeTab(3, 1, 2, 10),
      makeTab(4, 1, 3, 20),
      makeTab(6, 1, 4, 20),
      makeTab(5, 1, 5, -1),
    ])
    mockTabGroupsGet.mockImplementation(async (groupId: number) => {
      if (groupId === 10) {
        return {
          id: 10,
          title: 'Team',
          color: 'green',
          collapsed: false,
          windowId: 1,
        }
      }
      if (groupId === 20) {
        return {
          id: 20,
          title: 'Partial',
          color: 'red',
          collapsed: true,
          windowId: 1,
        }
      }
      return null
    })
    mockTabsGroup.mockResolvedValueOnce(71)

    await createWindow(tabs as any)

    expect(mockTabsMove.mock.calls.map(([id]) => id)).toEqual([2, 3, 4, 5])
    expect(mockTabsUngroup).toHaveBeenCalledWith([4])
    expect(mockTabsGroup).toHaveBeenCalledWith({
      tabIds: [2, 3],
    })
    expect(mockTabGroupsUpdate).toHaveBeenCalledWith(71, {
      title: 'Team',
      color: 'green',
      collapsed: false,
    })
    expect(mockTabGroupsUpdate).not.toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ title: 'Partial' }),
    )
  })

  it('hydrates runtime-shaped tabs before preserving whole groups and detaching partial fragments in a new window', async () => {
    const tabs = [
      { id: 1, pinned: false },
      { id: 2, pinned: false },
      { id: 3, pinned: false },
      { id: 4, pinned: false },
    ]
    mockTabsGet.mockImplementation(async (id: number) => {
      if (id === 1) {
        return makeTab(1, 1, 0, -1)
      }
      if (id === 2) {
        return makeTab(2, 1, 1, 10)
      }
      if (id === 3) {
        return makeTab(3, 1, 2, 10)
      }
      if (id === 4) {
        return makeTab(4, 1, 3, 20)
      }
      return null
    })
    mockTabsQuery.mockResolvedValue([
      makeTab(1, 1, 0, -1),
      makeTab(2, 1, 1, 10),
      makeTab(3, 1, 2, 10),
      makeTab(4, 1, 3, 20),
      makeTab(5, 1, 4, 20),
    ])
    mockTabGroupsGet.mockImplementation(async (groupId: number) => {
      if (groupId === 10) {
        return {
          id: 10,
          title: 'Team',
          color: 'green',
          collapsed: false,
          windowId: 1,
        }
      }
      if (groupId === 20) {
        return {
          id: 20,
          title: 'Partial',
          color: 'red',
          collapsed: true,
          windowId: 1,
        }
      }
      return null
    })
    mockTabsGroup.mockResolvedValueOnce(71)

    await createWindow(tabs as any)

    expect(mockWindowsCreate).toHaveBeenCalledWith({ tabId: 1 })
    expect(mockTabsMove).toHaveBeenNthCalledWith(1, 2, {
      windowId: 99,
      index: -1,
    })
    expect(mockTabsMove).toHaveBeenNthCalledWith(2, 3, {
      windowId: 99,
      index: -1,
    })
    expect(mockTabsMove).toHaveBeenNthCalledWith(3, 4, {
      windowId: 99,
      index: -1,
    })
    expect(mockTabsUngroup).toHaveBeenCalledWith([4])
    expect(mockTabsGroup).toHaveBeenCalledWith({
      tabIds: [2, 3],
    })
    expect(mockTabGroupsUpdate).toHaveBeenCalledWith(71, {
      title: 'Team',
      color: 'green',
      collapsed: false,
    })
  })

  it('preserves multiple whole groups in visible order when opening a new window', async () => {
    const tabs = [
      makeTab(1, 1, 0, 10),
      makeTab(2, 1, 1, 10),
      makeTab(3, 1, 2, -1),
      makeTab(4, 1, 3, 20),
      makeTab(5, 1, 4, 20),
    ]
    mockTabsQuery.mockResolvedValue(tabs)
    mockTabGroupsGet.mockImplementation(async (groupId: number) => {
      if (groupId === 10) {
        return {
          id: 10,
          title: 'First',
          color: 'yellow',
          collapsed: false,
          windowId: 1,
        }
      }
      if (groupId === 20) {
        return {
          id: 20,
          title: 'Second',
          color: 'purple',
          collapsed: true,
          windowId: 1,
        }
      }
      return null
    })
    mockTabsGroup.mockResolvedValueOnce(71).mockResolvedValueOnce(72)

    await createWindow(tabs as any)

    expect(mockTabsMove.mock.calls.map(([id]) => id)).toEqual([2, 3, 4, 5])
    expect(mockTabsGroup.mock.calls[0][0]).toEqual({
      tabIds: [1, 2],
    })
    expect(mockTabsGroup.mock.calls[1][0]).toEqual({
      tabIds: [4, 5],
    })
    expect(mockTabGroupsUpdate).toHaveBeenNthCalledWith(1, 71, {
      title: 'First',
      color: 'yellow',
      collapsed: false,
    })
    expect(mockTabGroupsUpdate).toHaveBeenNthCalledWith(2, 72, {
      title: 'Second',
      color: 'purple',
      collapsed: true,
    })
  })

  it('restores title, color, and collapsed state on recreated groups', async () => {
    const tabs = [makeTab(1, 1, 0, 10), makeTab(2, 1, 1, 10)]
    mockTabsQuery.mockResolvedValue(tabs)
    mockTabGroupsGet.mockResolvedValue({
      id: 10,
      title: 'Research',
      color: 'orange',
      collapsed: true,
      windowId: 1,
    })
    mockTabsGroup.mockResolvedValueOnce(71)

    await createWindow(tabs as any)

    expect(mockTabGroupsUpdate).toHaveBeenCalledWith(71, {
      title: 'Research',
      color: 'orange',
      collapsed: true,
    })
  })
})
