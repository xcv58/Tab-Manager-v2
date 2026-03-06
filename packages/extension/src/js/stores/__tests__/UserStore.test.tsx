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
})
