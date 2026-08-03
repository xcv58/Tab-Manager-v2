import SearchStore, { matchesSearchText } from 'stores/SearchStore'
import { browser } from 'libs'
import log from 'libs/log'

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

  it('prefers contiguous tab matches and falls back to fuzzy matches', () => {
    const searchStore = new SearchStore({
      windowStore: {
        tabs: [
          {
            id: 1,
            title: 'Daily Interesting Science Course',
            url: '',
            isVisible: true,
          },
          {
            id: 2,
            title: 'Discord Guide',
            url: '',
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
      },
      userStore: {
        showUrl: false,
        searchHistory: false,
      },
    } as any)

    searchStore._query = 'disc'
    expect(searchStore.matchMode).toBe('contiguous')
    expect(searchStore.rawMatchedTabs.map((tab) => tab.id)).toEqual([2])
    expect(Array.from(searchStore.matchedSet)).toEqual([2])

    searchStore._query = 'dsc'
    expect(searchStore.matchMode).toBe('fuzzy')
    expect(new Set(searchStore.rawMatchedTabs.map((tab) => tab.id))).toEqual(
      new Set([1, 2]),
    )
  })

  it('uses history when selecting the full-page adaptive match mode', () => {
    const fuzzyTab = {
      id: 1,
      title: 'Daily Interesting Science Course',
      url: '',
      isVisible: true,
    }
    const searchStore = new SearchStore({
      windowStore: {
        tabs: [fuzzyTab],
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
        searchHistory: true,
      },
    } as any)

    searchStore._query = 'disc'
    searchStore.historyTabs = [
      {
        id: 'history-1',
        title: 'Discord',
        url: '',
        visitCount: 1,
      },
    ]

    expect(searchStore.matchMode).toBe('contiguous')
    expect(searchStore.rawMatchedTabs).toEqual([])

    searchStore.historyTabs = []
    expect(searchStore.matchMode).toBe('fuzzy')
    expect(searchStore.rawMatchedTabs).toEqual([fuzzyTab])
  })

  it('ignores history responses from an older search', async () => {
    let resolveFirstHistory: (items: any[]) => void
    let resolveSecondHistory: (items: any[]) => void
    const firstHistory = new Promise<any[]>((resolve) => {
      resolveFirstHistory = resolve
    })
    const secondHistory = new Promise<any[]>((resolve) => {
      resolveSecondHistory = resolve
    })
    jest
      .spyOn(browser.history, 'search')
      .mockReturnValueOnce(firstHistory as any)
      .mockReturnValueOnce(secondHistory as any)

    const searchStore = new SearchStore({
      windowStore: { tabs: [] },
      focusStore: { focusedTabId: null, defocus: jest.fn() },
      tabStore: { isTabSelected: () => false },
      userStore: {
        showUrl: false,
        searchHistory: true,
      },
    } as any)

    searchStore.query = 'first'
    const firstUpdate = searchStore._updateQuery()
    searchStore.query = 'second'
    const secondUpdate = searchStore._updateQuery()

    const secondItems = [
      { id: 'second', title: 'Second result', visitCount: 1 },
    ]
    resolveSecondHistory!(secondItems)
    await secondUpdate
    resolveFirstHistory!([
      { id: 'first', title: 'First result', visitCount: 1 },
    ])
    await firstUpdate

    expect(searchStore.historyTabs).toEqual(secondItems)
  })

  it('invalidates active history before the next debounced update starts', async () => {
    jest.useFakeTimers()
    let resolveFirstHistory: (items: any[]) => void
    const firstHistory = new Promise<any[]>((resolve) => {
      resolveFirstHistory = resolve
    })
    jest
      .spyOn(browser.history, 'search')
      .mockReturnValueOnce(firstHistory as any)

    const searchStore = new SearchStore({
      windowStore: { tabs: [] },
      focusStore: { focusedTabId: null, defocus: jest.fn() },
      tabStore: { isTabSelected: () => false },
      userStore: {
        showUrl: false,
        searchHistory: true,
        preserveSearch: false,
      },
    } as any)

    searchStore.search('first')
    jest.advanceTimersByTime(200)
    await Promise.resolve()
    expect(browser.history.search).toHaveBeenCalledTimes(1)

    searchStore.search('second')
    resolveFirstHistory!([
      { id: 'first', title: 'First result', visitCount: 1 },
    ])
    await Promise.resolve()
    await Promise.resolve()

    expect(searchStore.query).toBe('second')
    expect(searchStore.historyTabs).toEqual([])

    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('refreshes history for an unchanged query when history is enabled', async () => {
    const historyItems = [{ id: 'history-1', title: 'Discord', visitCount: 1 }]
    jest.spyOn(browser.history, 'search').mockResolvedValue(historyItems as any)
    const userStore = {
      showUrl: false,
      searchHistory: true,
    }
    const searchStore = new SearchStore({
      windowStore: { tabs: [] },
      focusStore: { focusedTabId: null, defocus: jest.fn() },
      tabStore: { isTabSelected: () => false },
      userStore,
    } as any)
    searchStore.query = 'disc'
    searchStore._query = 'disc'

    await searchStore.enableHistorySearch()

    expect(browser.history.search).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'disc' }),
    )
    expect(searchStore.historyTabs).toEqual(historyItems)
    expect(searchStore.matchMode).toBe('contiguous')
  })

  it('refreshes an invalidated history request after command search closes', async () => {
    jest.useFakeTimers()
    let resolveFirstHistory: (items: any[]) => void
    let resolveSecondHistory: (items: any[]) => void
    const firstHistory = new Promise<any[]>((resolve) => {
      resolveFirstHistory = resolve
    })
    const secondHistory = new Promise<any[]>((resolve) => {
      resolveSecondHistory = resolve
    })
    jest
      .spyOn(browser.history, 'search')
      .mockReturnValueOnce(firstHistory as any)
      .mockReturnValueOnce(secondHistory as any)
    const searchStore = new SearchStore({
      windowStore: { tabs: [] },
      focusStore: { focusedTabId: null, defocus: jest.fn() },
      tabStore: { isTabSelected: () => false },
      userStore: {
        showUrl: false,
        searchHistory: true,
        preserveSearch: false,
      },
    } as any)

    searchStore.search('disc')
    jest.advanceTimersByTime(200)
    await Promise.resolve()
    expect(browser.history.search).toHaveBeenCalledTimes(1)

    const cachedItems = [
      { id: 'cached', title: 'Discord cached', visitCount: 1 },
    ]
    searchStore.historyTabs = cachedItems
    searchStore.search('>group')
    searchStore.stopType()
    expect(searchStore.query).toBe('disc')
    expect(browser.history.search).toHaveBeenCalledTimes(2)
    expect(searchStore.historyTabs).toEqual(cachedItems)

    const currentItems = [{ id: 'current', title: 'Discord', visitCount: 1 }]
    resolveSecondHistory!(currentItems)
    await Promise.resolve()
    await Promise.resolve()
    resolveFirstHistory!([{ id: 'stale', title: 'Stale', visitCount: 1 }])
    await Promise.resolve()
    await Promise.resolve()

    expect(searchStore.historyTabs).toEqual(currentItems)

    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('cancels pending normal query updates when command search starts', () => {
    jest.useFakeTimers()
    const searchStore = new SearchStore({
      windowStore: { tabs: [] },
      focusStore: { focusedTabId: null, defocus: jest.fn() },
      tabStore: { isTabSelected: () => false },
      userStore: {
        showUrl: false,
        searchHistory: false,
        preserveSearch: false,
      },
    } as any)
    searchStore.query = 'settled'
    searchStore._query = 'settled'
    searchStore._tabQuery = 'settled'

    searchStore.search('pending normal')
    jest.advanceTimersByTime(100)
    searchStore.search('>group')
    jest.advanceTimersByTime(500)

    expect(searchStore._query).toBe('settled')
    expect(searchStore._tabQuery).toBe('settled')

    searchStore.stopType()
    expect(searchStore.query).toBe('settled')
    expect(searchStore.isCommand).toBe(false)

    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('restores highlights when command search interrupts their debounce', () => {
    jest.useFakeTimers()
    const searchStore = new SearchStore({
      windowStore: { tabs: [] },
      focusStore: { focusedTabId: null, defocus: jest.fn() },
      tabStore: { isTabSelected: () => false },
      userStore: {
        showUrl: false,
        searchHistory: false,
        preserveSearch: false,
      },
    } as any)
    searchStore.query = 'old'
    searchStore._query = 'old'
    searchStore._tabQuery = 'old'

    searchStore.search('new')
    jest.advanceTimersByTime(200)

    expect(searchStore._query).toBe('new')
    expect(searchStore._tabQuery).toBe('old')
    expect(searchStore.tabHighlightQuery).toBe('')

    searchStore.search('>group')
    searchStore.stopType()

    expect(searchStore.query).toBe('new')
    expect(searchStore._tabQuery).toBe('new')
    expect(searchStore.tabHighlightQuery).toBe('new')

    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('ignores an in-flight history response after history is disabled', async () => {
    let resolveHistory: (items: any[]) => void
    const historyResponse = new Promise<any[]>((resolve) => {
      resolveHistory = resolve
    })
    jest
      .spyOn(browser.history, 'search')
      .mockReturnValue(historyResponse as any)
    const userStore = {
      showUrl: false,
      searchHistory: true,
    }
    const searchStore = new SearchStore({
      windowStore: { tabs: [] },
      focusStore: { focusedTabId: null, defocus: jest.fn() },
      tabStore: { isTabSelected: () => false },
      userStore,
    } as any)

    searchStore.query = 'disc'
    const update = searchStore._updateQuery()
    searchStore.disableHistorySearch()
    userStore.searchHistory = false
    resolveHistory!([{ id: 'history-1', title: 'Discord', visitCount: 1 }])
    await update

    expect(searchStore.historyTabs).toEqual([])
    expect(searchStore.searchMatchDocuments).toEqual([])
  })

  it('handles rejected history searches without disrupting query cleanup', async () => {
    const historyError = new Error('history unavailable')
    jest.spyOn(browser.history, 'search').mockRejectedValue(historyError)
    const warn = jest.spyOn(log, 'warn').mockImplementation()
    const repackLayout = jest.fn()
    const defocus = jest.fn()
    const searchStore = new SearchStore({
      windowStore: {
        tabs: [],
        getVisibleRowCountSnapshot: jest.fn(() => []),
        haveVisibleRowCountsChanged: jest.fn(() => true),
        repackLayout,
      },
      focusStore: { focusedTabId: 999, defocus },
      tabStore: { isTabSelected: () => false },
      userStore: {
        showUrl: false,
        searchHistory: true,
      },
    } as any)

    searchStore.query = 'disc'

    await expect(searchStore._updateQuery()).resolves.toBeUndefined()

    expect(searchStore._query).toBe('disc')
    expect(searchStore.historyTabs).toEqual([])
    expect(repackLayout).toHaveBeenCalledWith('search-change')
    expect(defocus).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('SearchStore.loadHistoryTabs failed', {
      error: historyError,
    })
  })

  it('repacks and defocuses when history changes the adaptive phase', async () => {
    jest
      .spyOn(browser.history, 'search')
      .mockResolvedValue([
        { id: 'history-1', title: 'Discord', url: '', visitCount: 1 },
      ] as any)
    const repackLayout = jest.fn()
    const defocus = jest.fn()
    const searchStore = new SearchStore({
      windowStore: {
        tabs: [
          {
            id: 1,
            title: 'Daily Interesting Science Course',
            url: '',
            isVisible: true,
          },
        ],
        getVisibleRowCountSnapshot: jest.fn(() => []),
        haveVisibleRowCountsChanged: jest.fn(() => true),
        repackLayout,
      },
      focusStore: { focusedTabId: 1, defocus },
      tabStore: { isTabSelected: () => false },
      userStore: {
        showUrl: false,
        searchHistory: true,
      },
    } as any)

    searchStore.query = 'disc'
    await searchStore._updateQuery()

    expect(searchStore.matchMode).toBe('contiguous')
    expect(searchStore.rawMatchedTabs).toEqual([])
    expect(repackLayout).toHaveBeenCalledTimes(2)
    expect(defocus).toHaveBeenCalledTimes(1)
  })

  it('suppresses stale highlights while the filtered query catches up', () => {
    jest.useFakeTimers()
    const searchStore = new SearchStore({
      windowStore: {
        tabs: [
          {
            id: 1,
            title: 'Daily Science Course',
            url: '',
            isVisible: true,
          },
          {
            id: 2,
            title: 'Discord Guide',
            url: '',
            isVisible: true,
          },
        ],
        repackLayout: jest.fn(),
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
        preserveSearch: false,
      },
    } as any)

    try {
      searchStore.query = 'dsc'
      searchStore._query = 'dsc'
      searchStore._tabQuery = 'dsc'

      searchStore.search('disc')
      jest.advanceTimersByTime(200)

      expect(searchStore._query).toBe('disc')
      expect(searchStore._tabQuery).toBe('dsc')
      expect(searchStore.tabHighlightQuery).toBe('')
      expect(searchStore.tabHighlightMatchMode).toBe('none')

      jest.advanceTimersByTime(300)

      expect(searchStore._tabQuery).toBe('disc')
      expect(searchStore.tabHighlightQuery).toBe('disc')
      expect(searchStore.tabHighlightMatchMode).toBe('contiguous')
    } finally {
      jest.useRealTimers()
    }
  })

  it('uses only enabled URL and group-title fields for adaptive matching', () => {
    const userStore = {
      showUrl: false,
      searchHistory: false,
    }
    const tabGroupStore = {
      hasTabGroupsApi: () => false,
    }
    const searchStore = new SearchStore({
      windowStore: {
        tabs: [
          {
            id: 1,
            title: 'Alpha tab',
            url: 'https://example.com/needle',
            groupTitle: 'ResearchDocs',
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
      },
      tabGroupStore,
      userStore,
    } as any)

    searchStore._query = 'needle'
    expect(searchStore.rawMatchedTabs).toEqual([])
    userStore.showUrl = true
    expect(searchStore.rawMatchedTabs.map((tab) => tab.id)).toEqual([1])

    searchStore._query = 'research'
    expect(searchStore.rawMatchedTabs).toEqual([])
    tabGroupStore.hasTabGroupsApi = () => true
    expect(searchStore.rawMatchedTabs.map((tab) => tab.id)).toEqual([1])
  })

  it('should detect when a query matches a group title', () => {
    expect(matchesSearchText('SearchDocs', 'SearchDocs')).toBe(true)
    expect(matchesSearchText('SearchDocs', 'docs')).toBe(true)
    expect(matchesSearchText('SearchDocs', 'nextjs')).toBe(false)
    expect(matchesSearchText('', 'docs')).toBe(false)
  })
})
