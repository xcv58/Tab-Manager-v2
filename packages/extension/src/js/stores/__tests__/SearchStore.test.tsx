import SearchStore, { matchesSearchText } from 'stores/SearchStore'
import { browser } from 'libs'

describe('SearchStore', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('focuses and blurs a direct input ref used by the local search field', () => {
    const searchStore = new SearchStore({
      windowStore: {
        tabs: [],
      },
      focusStore: {
        focusedTabId: null,
        defocus: jest.fn(),
      },
      tabStore: {
        isTabSelected: () => false,
      },
      userStore: {
        showUrl: false,
        searchHistory: false,
      },
    } as any)

    const input = document.createElement('input')
    document.body.appendChild(input)
    searchStore.searchEl = { current: input } as any

    searchStore.focus()
    expect(document.activeElement).toBe(input)

    searchStore.blur()
    expect(document.activeElement).not.toBe(input)
  })

  it('restores command search text selection when the search ref points directly at the input', async () => {
    jest
      .spyOn(browser.storage.local, 'get')
      .mockResolvedValue({ lastCommand: 'group' } as any)

    const searchStore = new SearchStore({
      windowStore: {
        tabs: [],
      },
      focusStore: {
        focusedTabId: null,
        defocus: jest.fn(),
      },
      tabStore: {
        isTabSelected: () => false,
      },
      userStore: {
        showUrl: false,
        searchHistory: false,
      },
    } as any)

    const input = document.createElement('input')
    document.body.appendChild(input)
    searchStore.searchEl = { current: input } as any
    const setSelectionRangeSpy = jest.spyOn(input, 'setSelectionRange')

    await searchStore.startCommandSearch()

    expect(searchStore.query).toBe('>group')
    expect(document.activeElement).toBe(input)
    expect(setSelectionRangeSpy).toHaveBeenCalledWith(1, 6)
  })

  it('should repack layout after updating the active search query', async () => {
    const repackLayout = jest.fn()
    const getVisibleRowCountSnapshot = jest.fn(() => [
      { windowId: 1, visibleLength: 2 },
    ])
    const haveVisibleRowCountsChanged = jest.fn(() => true)
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
        getVisibleRowCountSnapshot,
        haveVisibleRowCountsChanged,
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
    expect(getVisibleRowCountSnapshot).toHaveBeenCalledTimes(1)
    expect(haveVisibleRowCountsChanged).toHaveBeenCalledWith([
      { windowId: 1, visibleLength: 2 },
    ])
    expect(defocus).toHaveBeenCalledTimes(1)
  })

  it('skips layout repack when visible row counts stay unchanged', async () => {
    const repackLayout = jest.fn()
    const defocus = jest.fn()
    const searchStore = new SearchStore({
      windowStore: {
        tabs: [
          {
            id: 1,
            title: 'Alpha tab',
            url: 'https://example.com/alpha',
            isVisible: true,
          },
        ],
        repackLayout,
        getVisibleRowCountSnapshot: jest.fn(() => [
          { windowId: 1, visibleLength: 3 },
        ]),
        haveVisibleRowCountsChanged: jest.fn(() => false),
      },
      focusStore: {
        focusedTabId: 1,
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

    expect(repackLayout).not.toHaveBeenCalled()
    expect(defocus).not.toHaveBeenCalled()
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

  it('clears focused tab state when the focused tab falls out of the match set', () => {
    const defocus = jest.fn()
    const searchStore = new SearchStore({
      windowStore: {
        tabs: [
          {
            id: 1,
            title: 'Alpha tab',
            url: 'https://example.com/alpha',
            isVisible: true,
          },
        ],
      },
      focusStore: {
        focusedTabId: 2,
        defocus,
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

    searchStore.clearFilteredFocusedTab()

    expect(defocus).toHaveBeenCalledTimes(1)
  })

  it('builds cached search documents from the enabled search fields', () => {
    const searchStore = new SearchStore({
      windowStore: {
        tabs: [
          {
            id: 1,
            title: 'Alpha tab',
            url: 'https://example.com/alpha',
            groupTitle: 'Docs',
            isVisible: true,
          },
          {
            id: 2,
            title: 'Beta tab',
            url: 'https://example.com/needle-target',
            groupTitle: 'Research',
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
      tabGroupStore: {
        hasTabGroupsApi: () => true,
      },
      userStore: {
        showUrl: false,
        searchHistory: false,
      },
    } as any)

    expect(
      searchStore.tabSearchDocuments.map(({ tab, title, url, groupTitle }) => ({
        id: tab.id,
        title,
        url,
        groupTitle,
      })),
    ).toEqual([
      {
        id: 1,
        title: 'Alpha tab',
        url: '',
        groupTitle: 'Docs',
      },
      {
        id: 2,
        title: 'Beta tab',
        url: '',
        groupTitle: 'Research',
      },
    ])

    searchStore._query = 'research'

    expect(searchStore.rawMatchedTabs.map((tab) => tab.id)).toEqual([2])
  })

  it('should detect when a query matches a group title', () => {
    expect(matchesSearchText('SearchDocs', 'SearchDocs')).toBe(true)
    expect(matchesSearchText('SearchDocs', 'docs')).toBe(true)
    expect(matchesSearchText('SearchDocs', 'nextjs')).toBe(false)
    expect(matchesSearchText('', 'docs')).toBe(false)
  })
})
