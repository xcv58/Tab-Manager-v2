const mockTabsUpdate = jest.fn(() => Promise.resolve())
const mockTabsMove = jest.fn(() => Promise.resolve())

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
    },
    windows: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

import { ItemTypes, moveTabs } from 'libs'

describe('ItemTypes', () => {
  beforeEach(() => {
    mockTabsUpdate.mockClear()
    mockTabsMove.mockClear()
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
})
