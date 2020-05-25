import { MutableRefObject } from 'react'
import { action, computed, observable } from 'mobx'
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
    this.store = store
  }

  init = async () => {
    if (this.store.userStore.preserveSearch) {
      const { query } = await browser.storage.local.get({ query: this.query })
      this.search(query)
    }
  }

  @observable
  searchEl: MutableRefObject<HTMLInputElement> = null

  @observable
  query = ''

  @observable
  _query = ''

  @observable
  // The _tabQuery is used only on tab content highlight
  _tabQuery = ''

  @observable
  typing = false

  @computed
  get isCommand () {
    return hasCommandPrefix(this.query)
  }

  @computed
  get matchedTabs (): Tab[] {
    return this.fuzzySearch()
  }

  @computed
  get matchedSet () {
    return new Set(this.matchedTabs.map((x) => x.id))
  }

  @computed
  get allTabSelected () {
    return this.matchedTabs.every(this.store.tabStore.isTabSelected)
  }

  @computed
  get someTabSelected () {
    return (
      !this.allTabSelected &&
      this.matchedTabs.some(this.store.tabStore.isTabSelected)
    )
  }

  @action
  setSearchEl = (searchEl) => {
    this.searchEl = searchEl
  }

  @action
  focus = () => {
    this.searchEl.current.click()
  }

  @action
  startCommandSearch = async () => {
    const { lastCommand } = await browser.storage.local.get({ lastCommand: '' })
    this.search(`>${lastCommand}`)
    if (lastCommand) {
      const inputEl = this.searchEl.current.querySelector('input')
      if (inputEl) {
        inputEl.setSelectionRange(1, 1 + lastCommand.length)
      }
    }
    this.focus()
  }

  @action
  blur = () => {
    const inputEl = this.searchEl.current.querySelector('input')
    if (inputEl) {
      inputEl.blur()
    }
  }

  @action
  startType = () => {
    this.typing = true
  }

  @action
  stopType = () => {
    this.typing = false
    if (this.isCommand) {
      this.query = this._query
    }
  }

  @action
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

  @action
  updateQuery = debounce(this._updateQuery, 200)

  @action
  updateTabQuery = debounce(this._updateTabQuery, 500)

  @action
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

  @action
  selectAll = () => {
    this.store.tabStore.selectAll(this.matchedTabs)
  }

  @action
  invertSelect = () => {
    this.store.tabStore.invertSelect(this.matchedTabs)
  }

  @action
  unselectAll = () => {
    this.store.tabStore.unselectAll()
  }
}
