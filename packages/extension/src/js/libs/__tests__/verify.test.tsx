const mockStorageGet = jest.fn()
const mockStorageSyncGet = jest.fn()
const mockWindowsGet = jest.fn()
const mockWindowsGetAll = jest.fn()
const mockGetLastFocusedWindowId = jest.fn()
const mockIsSelfPopup = jest.fn()

jest.mock('libs', () => ({
  browser: {
    storage: {
      local: {
        get: mockStorageGet,
      },
      sync: {
        get: mockStorageSyncGet,
      },
    },
    windows: {
      get: mockWindowsGet,
      getAll: mockWindowsGetAll,
    },
  },
  getLastFocusedWindowId: mockGetLastFocusedWindowId,
  isSelfPopup: mockIsSelfPopup,
}))

import {
  formatActionTabCountLabel,
  getActionTabCount,
  getActionCountLayout,
  readActionIconSettings,
} from 'libs/verify'

describe('verify tab count helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsSelfPopup.mockImplementation(() => false)
    mockStorageGet.mockResolvedValue({})
    mockStorageSyncGet.mockResolvedValue({})
  })

  it('returns null when the action tab count mode is off', async () => {
    await expect(getActionTabCount('off')).resolves.toBeNull()
  })

  it('counts tabs from the last focused window for current window mode', async () => {
    mockGetLastFocusedWindowId.mockResolvedValue(12)
    mockWindowsGet.mockResolvedValue({
      id: 12,
      type: 'normal',
      tabs: [{ id: 1 }, { id: 2 }, { id: 3 }],
    })

    await expect(getActionTabCount('currentWindow')).resolves.toBe(3)
    expect(mockWindowsGet).toHaveBeenCalledWith(12, { populate: true })
  })

  it('counts tabs across non-popup windows for all windows mode', async () => {
    mockWindowsGetAll.mockResolvedValue([
      {
        id: 1,
        type: 'normal',
        tabs: [{ id: 1 }, { id: 2 }],
      },
      {
        id: 2,
        type: 'popup',
        tabs: [{ id: 20 }],
      },
      {
        id: 3,
        type: 'normal',
        tabs: [{ id: 30 }],
      },
    ])
    mockIsSelfPopup.mockImplementation((win) => win.id === 2)

    await expect(getActionTabCount('allWindows')).resolves.toBe(3)
  })

  it('caps large tab counts to keep the icon label readable', () => {
    expect(formatActionTabCountLabel(7)).toBe('7')
    expect(formatActionTabCountLabel(18)).toBe('18')
    expect(formatActionTabCountLabel(104)).toBe('104')
    expect(formatActionTabCountLabel(999)).toBe('999')
    expect(formatActionTabCountLabel(1000)).toBe('1k+')
    expect(formatActionTabCountLabel(2500)).toBe('2k+')
    expect(formatActionTabCountLabel(12_500)).toBe('12k+')
  })

  it('uses a bottom-right overlay layout that preserves the base T icon', () => {
    expect(getActionCountLayout(16, '8')).toEqual(
      expect.objectContaining({
        overlayInsetLeft: 6,
        overlayInsetRight: 0,
        overlayBottomInset: 0,
        overlayHeight: 10,
        fontSize: 11,
        textScaleX: 1,
      }),
    )
    expect(getActionCountLayout(16, '42')).toEqual(
      expect.objectContaining({
        overlayInsetLeft: 4,
        overlayInsetRight: 0,
        overlayBottomInset: 0,
        overlayHeight: 10,
        fontSize: 10,
        textScaleX: 1,
      }),
    )
    expect(getActionCountLayout(16, '1k+')).toEqual(
      expect.objectContaining({
        overlayInsetLeft: 1,
        overlayInsetRight: 0,
        overlayBottomInset: 0,
        overlayHeight: 9,
        fontSize: 8,
        textScaleX: 0.94,
      }),
    )
    expect(getActionCountLayout(16, '12k+')).toEqual(
      expect.objectContaining({
        overlayInsetLeft: 0,
        overlayInsetRight: 0,
        overlayBottomInset: 0,
        overlayHeight: 9,
        fontSize: 7,
        textScaleX: 0.86,
      }),
    )
  })

  it('prefers the synced action tab count mode and keeps the local theme', async () => {
    mockStorageSyncGet.mockResolvedValue({
      actionTabCountMode: 'allWindows',
    })
    mockStorageGet.mockResolvedValue({
      actionTabCountMode: 'off',
      systemTheme: 'dark',
    })

    await expect(readActionIconSettings()).resolves.toEqual({
      actionTabCountMode: 'allWindows',
      systemTheme: 'dark',
    })
  })

  it('falls back to local action tab count mode when sync storage is unavailable', async () => {
    mockStorageSyncGet.mockRejectedValue(new Error('sync unavailable'))
    mockStorageGet.mockResolvedValue({
      actionTabCountMode: 'currentWindow',
      systemTheme: 'light',
    })

    await expect(readActionIconSettings()).resolves.toEqual({
      actionTabCountMode: 'currentWindow',
      systemTheme: 'light',
    })
  })
})
