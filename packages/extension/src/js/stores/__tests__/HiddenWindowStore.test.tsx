import HiddenWindowStore from 'stores/HiddenWindowStore'

jest.mock('libs', () => ({
  browser: {
    storage: {
      local: {
        get: jest.fn(() => Promise.resolve({ hiddenWindows: {} })),
        set: jest.fn(),
      },
    },
  },
}))

describe('HiddenWindowStore', () => {
  it('should mark layout dirty on toggleHideForAllWindows', () => {
    const markLayoutDirtyIfNeeded = jest.fn()
    const store = new HiddenWindowStore({
      windowStore: {
        markLayoutDirtyIfNeeded,
        windows: [{ id: 1 }, { id: 2 }],
      },
    } as any)

    store.toggleHideForAllWindows()

    expect(markLayoutDirtyIfNeeded).toHaveBeenCalledWith('window-toggle')
  })

  it('should mark layout dirty on updateHideForAllWindows', () => {
    const markLayoutDirtyIfNeeded = jest.fn()
    const store = new HiddenWindowStore({
      windowStore: {
        markLayoutDirtyIfNeeded,
        windows: [{ id: 1 }, { id: 2 }],
      },
    } as any)

    store.updateHideForAllWindows(true)
    store.updateHideForAllWindows(false)

    expect(markLayoutDirtyIfNeeded).toHaveBeenCalledTimes(2)
    expect(markLayoutDirtyIfNeeded).toHaveBeenNthCalledWith(1, 'window-toggle')
    expect(markLayoutDirtyIfNeeded).toHaveBeenNthCalledWith(2, 'window-toggle')
  })
})
