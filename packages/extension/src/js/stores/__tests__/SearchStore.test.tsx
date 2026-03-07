import SearchStore from 'stores/SearchStore'

describe('SearchStore', () => {
  it('should repack layout after updating the active search query', async () => {
    const repackLayout = jest.fn()
    const defocus = jest.fn()
    const searchStore = new SearchStore({
      windowStore: {
        tabs: [
          {
            id: 1,
            title: 'Alpha tab',
            url: 'https://example.com/alpha',
          },
        ],
        repackLayout,
      },
      focusStore: {
        focusedTabId: 999,
        defocus,
      },
      tabStore: {
        isTabSelected: () => false,
      },
      userStore: {
        showUrl: false,
        searchHistory: false,
      },
    } as any)

    searchStore.query = 'alpha'
    await searchStore._updateQuery()

    expect(searchStore._query).toBe('alpha')
    expect(repackLayout).toHaveBeenCalledWith('search-change')
    expect(defocus).toHaveBeenCalledTimes(1)
  })
})
