const mockStorageLocalGet = jest.fn()
const mockStorageSyncGet = jest.fn()
const mockWindowsGetAll = jest.fn()
const mockRuntimeGetURL = jest.fn((path) => `chrome-extension://test/${path}`)
const mockBrowserActionSetIcon = jest.fn()
const mockBrowserActionSetTitle = jest.fn()
const mockActionSetIcon = jest.fn()
const mockActionSetTitle = jest.fn()
const mockGetLastFocusedWindowId = jest.fn()
const mockIsSelfPopup = jest.fn()
const mockCanvasGetImageData = jest.fn()
const mockFetch = jest.fn()
const mockCreateImageBitmap = jest.fn()

jest.mock('libs', () => ({
  browser: {
    storage: {
      local: {
        get: mockStorageLocalGet,
      },
      sync: {
        get: mockStorageSyncGet,
      },
    },
    windows: {
      getAll: mockWindowsGetAll,
    },
    runtime: {
      getURL: mockRuntimeGetURL,
    },
    browserAction: {
      setIcon: mockBrowserActionSetIcon,
      setTitle: mockBrowserActionSetTitle,
    },
    action: {
      setIcon: mockActionSetIcon,
      setTitle: mockActionSetTitle,
    },
  },
  getLastFocusedWindowId: mockGetLastFocusedWindowId,
  isSelfPopup: mockIsSelfPopup,
}))

class MockOffscreenCanvas {
  width: number
  height: number

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  getContext() {
    return {
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      quadraticCurveTo: jest.fn(),
      closePath: jest.fn(),
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      fillText: jest.fn(),
      getImageData: mockCanvasGetImageData,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: 'center',
      textBaseline: 'middle',
    }
  }
}

const setAllWindowTabCount = (count: number) => {
  mockWindowsGetAll.mockResolvedValue([
    {
      id: 1,
      type: 'normal',
      tabs: Array.from({ length: count }, (_, index) => ({ id: index + 1 })),
    },
  ])
}

describe('setBrowserIcon', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    mockStorageLocalGet.mockResolvedValue({
      systemTheme: 'light',
    })
    mockStorageSyncGet.mockResolvedValue({
      actionTabCountMode: 'allWindows',
    })
    mockCanvasGetImageData.mockImplementation((x, y, width, height) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    }))
    mockCreateImageBitmap.mockResolvedValue({ width: 128, height: 128 })
    mockIsSelfPopup.mockImplementation(() => false)
    setAllWindowTabCount(1)
    global.OffscreenCanvas = MockOffscreenCanvas as typeof OffscreenCanvas
    global.fetch = mockFetch as typeof fetch
    global.createImageBitmap = mockCreateImageBitmap as typeof createImageBitmap
  })

  it('retries icon bitmap loading after a previous fetch failure', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('icon fetch failed'))
      .mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['icon'])),
      })

    const { setBrowserIcon } = await import('libs/verify')

    await expect(setBrowserIcon()).rejects.toThrow('icon fetch failed')
    await expect(setBrowserIcon()).resolves.toBeUndefined()

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockActionSetIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        imageData: expect.any(Object),
      }),
    )
  })

  it('evicts older rendered labels when the image data cache grows past 128 entries', async () => {
    mockFetch.mockResolvedValue({
      blob: jest.fn().mockResolvedValue(new Blob(['icon'])),
    })

    const { setBrowserIcon } = await import('libs/verify')

    for (let count = 1; count <= 33; count += 1) {
      setAllWindowTabCount(count)
      await setBrowserIcon()
    }

    expect(mockCanvasGetImageData).toHaveBeenCalledTimes(132)

    setAllWindowTabCount(1)
    await setBrowserIcon()

    expect(mockCanvasGetImageData).toHaveBeenCalledTimes(136)
  })
})
