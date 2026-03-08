import UserStore from 'stores/UserStore'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('UserStore', () => {
  it('should always set loaded even when settings read fails', async () => {
    const initSearch = jest.fn()
    const userStore = new UserStore({
      searchStore: {
        init: initSearch,
      },
    } as any)
    await flush()

    userStore.loaded = false
    initSearch.mockClear()
    jest
      .spyOn(userStore, 'readSettings')
      .mockRejectedValueOnce(new Error('settings read failed'))

    await expect(userStore.init()).resolves.toBeUndefined()

    expect(userStore.loaded).toBe(true)
    expect(initSearch).toHaveBeenCalledTimes(1)
  })

  it('should repack layout when tab width or font size changes', async () => {
    const repackLayout = jest.fn()
    const userStore = new UserStore({
      searchStore: {
        init: jest.fn(),
      },
      windowStore: {
        repackLayout,
      },
    } as any)
    await flush()

    repackLayout.mockClear()

    userStore.updateTabWidth(24)
    userStore.updateFontSize(16)

    expect(repackLayout).toHaveBeenCalledTimes(2)
    expect(repackLayout).toHaveBeenNthCalledWith(1, 'settings-change')
    expect(repackLayout).toHaveBeenNthCalledWith(2, 'settings-change')
  })

  it('should repack layout after loading stored font size or tab width', async () => {
    const repackLayout = jest.fn()
    const userStore = new UserStore({
      searchStore: {
        init: jest.fn(),
      },
      windowStore: {
        repackLayout,
      },
    } as any)
    await flush()

    repackLayout.mockClear()
    jest.spyOn(userStore, 'readSettings').mockResolvedValueOnce({
      fontSize: 10,
      tabWidth: 24,
    })

    await userStore.init()

    expect(repackLayout).toHaveBeenCalledTimes(1)
    expect(repackLayout).toHaveBeenCalledWith('settings-change')
  })

  it('should repack layout when toggling unmatched tabs visibility', async () => {
    const repackLayout = jest.fn()
    const userStore = new UserStore({
      searchStore: {
        init: jest.fn(),
      },
      windowStore: {
        repackLayout,
      },
    } as any)
    await flush()

    repackLayout.mockClear()

    userStore.toggleShowUnmatchedTab()

    expect(repackLayout).toHaveBeenCalledTimes(1)
    expect(repackLayout).toHaveBeenCalledWith('filter-change')
  })
})
