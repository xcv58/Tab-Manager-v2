const mockTabsUpdate = jest.fn(() => Promise.resolve())
const mockTabsMove = jest.fn(() => Promise.resolve())
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
    mockTabsUpdate.mockClear()
    mockTabsMove.mockClear()
    mockTabsQuery.mockReset()
    mockTabsGroup.mockReset()
    mockTabsUngroup.mockReset()
    mockTabGroupsGet.mockReset()
    mockTabGroupsUpdate.mockReset()
    mockWindowsCreate.mockReset()
    mockWindowsUpdate.mockClear()

    mockWindowsCreate.mockResolvedValue({ id: 99 })
    mockWindowsUpdate.mockResolvedValue(undefined)
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

  it('moves a fully-selected tab group into a fresh window without ungrouping it', async () => {
    const tabs = [makeTab(1, 1, 0, 10), makeTab(2, 1, 1, 10)]
    mockTabsQuery.mockResolvedValue(tabs)
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
      makeTab(1, 1, 0, -1),
      makeTab(2, 1, 1, 10),
      makeTab(3, 1, 2, 10),
      makeTab(4, 1, 3, 20),
      makeTab(5, 1, 4, -1),
    ]
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
