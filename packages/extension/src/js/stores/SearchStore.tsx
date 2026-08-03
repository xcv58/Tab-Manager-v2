import { MutableRefObject } from 'react'
import { makeAutoObservable } from 'mobx'
import { browser } from 'libs'
import Store from 'stores'
import log from 'libs/log'
import debounce from 'lodash.debounce'
import { getSearchMatchMode, matchItemsInMode } from 'libs/searchMatching'
import Tab from './Tab'

export { matchesSearchText } from 'libs/searchMatching'

const hasCommandPrefix = (value: string) => value.startsWith('>')

const DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24

export const getTabSearchKeys = ({
  showUrl,
  hasTabGroupsApi,
}: {
  showUrl: boolean
  hasTabGroupsApi: boolean
}) => {
  const keys = ['title']
  if (showUrl) {
    keys.push('url')
  }
  if (hasTabGroupsApi) {
    keys.push('groupTitle')
  }
  return keys
}

export type HistoryItem = {
  id: string
  lastVisitTime?: number
  title?: string
  typedCount?: number
  url?: string
  visitCount?: number
}

type TabSearchDocument = {
  tab: Tab
  title: string
  url: string
  groupTitle: string
}

export default class SearchStore {
  store: Store

  constructor(store: Store) {
    makeAutoObservable(this)

    this.store = store
  }

  init = async () => {
    if (this.store.userStore.preserveSearch) {
      const { query } = await browser.storage.local.get({ query: this.query })
      this.search(query)
    }
  }

  searchEl: MutableRefObject<HTMLElement | null> | null = null

  query = ''

  _query = ''

  // The _tabQuery is used only on tab content highlight
  _tabQuery = ''

  historyTabs: HistoryItem[] = []

  historySearchVersion = 0

  typing = false

  get isCommand() {
    return hasCommandPrefix(this.query)
  }

  get tabSearchKeys() {
    return getTabSearchKeys({
      showUrl: this.store.userStore.showUrl,
      hasTabGroupsApi: !!this.store.tabGroupStore?.hasTabGroupsApi?.(),
    })
  }

  get tabSearchDocuments(): TabSearchDocument[] {
    const includeUrl = this.store.userStore.showUrl
    const includeGroupTitle = !!this.store.tabGroupStore?.hasTabGroupsApi?.()

    return this.store.windowStore.tabs.map((tab) => ({
      tab,
      title: tab.title || '',
      url: includeUrl ? tab.url || '' : '',
      groupTitle: includeGroupTitle ? tab.groupTitle || '' : '',
    }))
  }

  get searchMatchDocuments(): Array<TabSearchDocument | HistoryItem> {
    const historyTabs = this.store.userStore.searchHistory
      ? this.historyTabs
      : []
    return [...this.tabSearchDocuments, ...historyTabs]
  }

  getMatchModeForQuery = (query: string) =>
    getSearchMatchMode(this.searchMatchDocuments, query, {
      keys: this.tabSearchKeys,
    })

  get rawMatchedTabDocuments(): TabSearchDocument[] {
    return matchItemsInMode(
      this.tabSearchDocuments,
      this._query,
      this.matchMode,
      { keys: this.tabSearchKeys },
    )
  }

  get matchMode() {
    return this.getMatchModeForQuery(this._query)
  }

  get tabHighlightQuery() {
    return this._tabQuery === this._query ? this._tabQuery : ''
  }

  get tabHighlightMatchMode() {
    return this.getMatchModeForQuery(this.tabHighlightQuery)
  }

  get matchedTabs(): Tab[] {
    return this.rawMatchedTabs.filter((tab) => tab.isVisible)
  }

  get rawMatchedTabs(): Tab[] {
    return this.rawMatchedTabDocuments.map((document) => document.tab)
  }

  get matchedSet() {
    return new Set(this.rawMatchedTabs.map((x) => x.id))
  }

  get allTabSelected() {
    return (
      this.matchedTabs.every(this.store.tabStore.isTabSelected) &&
      this.matchedTabs.length > 0
    )
  }

  get someTabSelected() {
    return (
      !this.allTabSelected &&
      this.matchedTabs.some(this.store.tabStore.isTabSelected)
    )
  }

  getSearchInputEl = () => {
    const current = this.searchEl?.current
    if (!current) {
      return null
    }

    if (current instanceof HTMLInputElement) {
      return current
    }

    return current.querySelector('input')
  }

  setSearchEl = (searchEl: MutableRefObject<HTMLElement | null>) => {
    this.searchEl = searchEl
  }

  focus = () => {
    this.getSearchInputEl()?.focus()
  }

  startCommandSearch = async () => {
    const { lastCommand } = await browser.storage.local.get({ lastCommand: '' })
    this.search(`>${lastCommand}`)
    this.focus()
    const inputEl = this.getSearchInputEl()
    if (inputEl) {
      inputEl.setSelectionRange(1, 1 + lastCommand.length)
    }
  }

  blur = () => {
    const inputEl = this.getSearchInputEl()
    if (inputEl) {
      inputEl.blur()
    }
  }

  startType = () => {
    this.typing = true
  }

  stopType = () => {
    this.typing = false
    if (this.isCommand) {
      this.query = this._query
    }
  }

  search = (query: string) => {
    log.debug('SearchStore.search:', { query, 'this.query': this.query })
    if (this.query === query) {
      return
    }
    // Invalidate an active history request as soon as the public query
    // changes. Waiting for the debounced update would leave a window where
    // results for the previous query could still be committed.
    this.historySearchVersion += 1
    this.query = query
    if (!this.isCommand) {
      this.updateQuery()
      this.updateTabQuery()
      if (this.store.userStore.preserveSearch) {
        browser.storage.local.set({ query })
      }
    } else {
      browser.storage.local.set({ lastCommand: query.slice(1) })
    }
  }

  _updateQuery = async () => {
    log.debug('_updateQuery:', { _query: this._query, query: this.query })
    const nextQuery = this.query
    const historySearchVersion = ++this.historySearchVersion
    const visibleRowCountsBefore =
      this.store.windowStore?.getVisibleRowCountSnapshot?.()
    this._query = nextQuery
    this.historyTabs = []
    const shouldRepackLayout =
      visibleRowCountsBefore == null ||
      this.store.windowStore?.haveVisibleRowCountsChanged?.(
        visibleRowCountsBefore,
      ) !== false
    if (shouldRepackLayout) {
      this.store.windowStore?.repackLayout?.('search-change')
    }
    this.clearFilteredFocusedTab()
    if (this.store.userStore.searchHistory && browser.history) {
      await this.loadHistoryTabs(nextQuery, historySearchVersion)
    }
  }

  loadHistoryTabs = async (query: string, historySearchVersion: number) => {
    const historyTabs = await browser.history.search({
      text: query,
      startTime: Date.now() - DAY_IN_MILLISECONDS * 7,
    })
    if (
      historySearchVersion !== this.historySearchVersion ||
      query !== this.query ||
      !this.store.userStore.searchHistory
    ) {
      return
    }
    const visibleRowCountsBeforeHistory =
      this.store.windowStore?.getVisibleRowCountSnapshot?.()
    this.historyTabs = historyTabs
    const shouldRepackAfterHistory =
      visibleRowCountsBeforeHistory == null ||
      this.store.windowStore?.haveVisibleRowCountsChanged?.(
        visibleRowCountsBeforeHistory,
      ) !== false
    if (shouldRepackAfterHistory) {
      this.store.windowStore?.repackLayout?.('search-change')
    }
    this.clearFilteredFocusedTab()
  }

  disableHistorySearch = () => {
    const visibleRowCountsBefore =
      this.store.windowStore?.getVisibleRowCountSnapshot?.()
    this.historySearchVersion += 1
    this.historyTabs = []
    const shouldRepackLayout =
      visibleRowCountsBefore == null ||
      this.store.windowStore?.haveVisibleRowCountsChanged?.(
        visibleRowCountsBefore,
      ) !== false
    if (shouldRepackLayout) {
      this.store.windowStore?.repackLayout?.('search-change')
    }
    this.clearFilteredFocusedTab()
  }

  enableHistorySearch = async () => {
    const historySearchVersion = ++this.historySearchVersion
    this.historyTabs = []
    if (
      browser.history &&
      !this.isCommand &&
      this.query === this._query &&
      this.store.userStore.searchHistory
    ) {
      await this.loadHistoryTabs(this.query, historySearchVersion)
    }
  }

  _updateTabQuery = () => {
    log.debug('_updateTabQuery:', {
      _tabQuery: this._tabQuery,
      query: this.query,
    })
    this._tabQuery = this.query
  }

  updateQuery = debounce(this._updateQuery, 200)

  updateTabQuery = debounce(this._updateTabQuery, 500)

  clear = () => this.search('')

  clearFilteredFocusedTab = () => {
    const focusedTabId = this.store.focusStore.focusedTabId
    if (focusedTabId != null && !this.matchedSet.has(focusedTabId)) {
      this.store.focusStore.defocus()
    }
  }

  fuzzySearch = () => {
    log.debug('SearchStore.fuzzySearch:', { _query: this._query })
    if (!this._query) {
      return this.rawMatchedTabs
    }
    return this.rawMatchedTabs
  }

  selectAll = () => {
    this.store.tabStore.selectAll(this.matchedTabs)
  }

  invertSelect = () => {
    this.store.tabStore.invertSelect(this.matchedTabs)
  }

  unselectAll = () => {
    this.store.tabStore.unselectAll()
  }

  toggleSelectAll = () => {
    if (this.allTabSelected) {
      this.unselectAll()
    } else {
      this.selectAll()
    }
  }
}
