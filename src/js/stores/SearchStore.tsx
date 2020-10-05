import { MutableRefObject } from 'react'
import { action, computed, observable, makeObservable } from 'mobx'
import { browser } from 'libs'
import Store from 'stores'
import log from 'libs/log'
import matchSorter from 'match-sorter'
import debounce from 'lodash.debounce'
import Tab from './Tab'

const hasCommandPrefix = (value) => value.startsWith('>')

export default class SearchStore {
  store: Store

  constructor (store) {
    makeObservable(this, {
      searchEl: observable,
      query: observable,
      _query: observable,
      _tabQuery: observable,
      typing: observable,
      isCommand: computed,
      matchedTabs: computed,
      matchedSet: computed,
      allTabSelected: computed,
      someTabSelected: computed,
      setSearchEl: action,
      focus: action,
      startCommandSearch: action,
      blur: action,
      startType: action,
      stopType: action,
      search: action,
      updateQuery: action,
      updateTabQuery: action,
      clear: action,
      selectAll: action,
      invertSelect: action,
      unselectAll: action
    })

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

  typing = false

  get isCommand () {
    return hasCommandPrefix(this.query)
  }

  get matchedTabs (): Tab[] {
    return this.fuzzySearch()
  }

  get matchedSet () {
    return new Set(this.matchedTabs.map((x) => x.id))
  }

  get allTabSelected () {
    return this.matchedTabs.every(this.store.tabStore.isTabSelected)
  }

  get someTabSelected () {
    return (
      !this.allTabSelected &&
      this.matchedTabs.some(this.store.tabStore.isTabSelected)
    )
  }

  setSearchEl = (searchEl) => {
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

  search = (query) => {
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

  _updateQuery = () => {
    log.debug('_updateQuery:', { _query: this._query, query: this.query })
    this._query = this.query
    if (!this.matchedSet.has(this.store.focusStore.focusedTabId)) {
      this.store.focusStore.defocus()
    }
  }

  _updateTabQuery = () => {
    log.debug('_updateTabQuery:', {
      _tabQuery: this._tabQuery,
      query: this.query
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
}
