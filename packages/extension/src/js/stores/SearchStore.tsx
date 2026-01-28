import { MutableRefObject } from 'react'
import { makeAutoObservable } from 'mobx'
import { browser } from 'libs'
import Store from 'stores'
import log from 'libs/log'
import { matchSorter } from 'match-sorter'
import debounce from 'lodash.debounce'
import Tab from './Tab'

const hasCommandPrefix = (value: string) => value.startsWith('>')

const DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24

export type HistoryItem = {
  id: string
  lastVisitTime?: number
  title?: string
  typedCount?: number
  url?: string
  visitCount?: number
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

  searchEl: MutableRefObject<HTMLInputElement> = null

  query = ''

  _query = ''

  // The _tabQuery is used only on tab content highlight
  _tabQuery = ''

  historyTabs: HistoryItem[] = []

  typing = false

  get isCommand() {
    return hasCommandPrefix(this.query)
  }

  get matchedTabs(): Tab[] {
    return this.fuzzySearch()
  }

  get matchedSet() {
    return new Set(this.matchedTabs.map((x) => x.id))
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

  setSearchEl = (searchEl: MutableRefObject<HTMLInputElement>) => {
    this.searchEl = searchEl
  }

  focus = () => {
    this.searchEl.current.click()
  }

  startCommandSearch = async () => {
    const { lastCommand } = await browser.storage.local.get({ lastCommand: '' })
    this.search(`>${lastCommand}`)
    this.focus()
    const inputEl = this.searchEl.current.querySelector('input')
    if (inputEl) {
      inputEl.setSelectionRange(1, 1 + lastCommand.length)
    }
  }

  blur = () => {
    const inputEl = this.searchEl.current.querySelector('input')
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
    this._query = this.query
    if (!this.matchedSet.has(this.store.focusStore.focusedTabId)) {
      this.store.focusStore.defocus()
    }
    if (this.store.userStore.searchHistory) {
      if (browser.history) {
        const historyTabs = await browser.history.search({
          text: this._query,
          startTime: Date.now() - DAY_IN_MILLISECONDS * 7,
        })
        this.historyTabs = historyTabs
      }
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

  fuzzySearch = () => {
    log.debug('SearchStore.fuzzySearch:', { _query: this._query })
    const { tabs } = this.store.windowStore
    if (!this._query) {
      return tabs
    }
    const keys = ['title']
    if (this.store.userStore.showUrl) {
      keys.push('url')
    }
    return matchSorter(tabs, this._query, { keys })
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
