import SearchStore, { matchesSearchText } from 'stores/SearchStore'

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

  it('should expose only visible matches while keeping the raw match set', () => {
    const searchStore = new SearchStore({
      windowStore: {
        tabs: [
          {
            id: 1,
            title: 'Hidden tab',
            url: 'https://example.com/hidden',
            isVisible: false,
          },
          {
            id: 2,
            title: 'Visible tab',
            url: 'https://example.com/visible',
            isVisible: true,
          },
        ],
      },
      focusStore: {
        focusedTabId: null,
        defocus: jest.fn(),
      },
      tabStore: {
        isTabSelected: () => false,
        selectAll: jest.fn(),
        invertSelect: jest.fn(),
      },
      userStore: {
        showUrl: false,
        searchHistory: false,
      },
    } as any)

    expect(searchStore.matchedTabs.map((tab) => tab.id)).toEqual([2])
    expect(Array.from(searchStore.matchedSet)).toEqual([1, 2])
  })

  it('should detect when a query matches a group title', () => {
    expect(matchesSearchText('SearchDocs', 'SearchDocs')).toBe(true)
    expect(matchesSearchText('SearchDocs', 'docs')).toBe(true)
    expect(matchesSearchText('SearchDocs', 'nextjs')).toBe(false)
    expect(matchesSearchText('', 'docs')).toBe(false)
  })
})
