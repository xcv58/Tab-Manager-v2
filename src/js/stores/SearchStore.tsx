import { action, computed, observable } from 'mobx'
import { filter as fuzzyFilter } from 'fuzzyjs'
import { browser } from 'libs'
import Store from 'stores'
import log from 'libs/log'
import debounce from 'lodash.debounce'
import Tab from './Tab'

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
  query = ''

  @observable
  _query = ''

  @observable
  _tabQuery = ''

  @observable
  typing = false

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
  startType = () => {
    this.typing = true
  }

  @action
  stopType = () => {
    this.typing = false
  }

  @action
  search = (query) => {
    log.debug('SearchStore.search:', { query, 'this.query': this.query })
    if (this.query === query) {
      return
    }
    this.query = query
    this.updateQuery()
    this.updateTabQuery()
    if (this.store.userStore.preserveSearch) {
      browser.storage.local.set({ query })
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
    const sourceAccessor = this.store.userStore.showUrl
      ? (x) => x.title + x.url
      : (x) => x.title
    return tabs.filter(fuzzyFilter(this._query, { sourceAccessor }))
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
