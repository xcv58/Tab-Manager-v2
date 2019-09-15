import { action, computed, observable } from 'mobx'
import { filter } from 'fuzzy'
import { activateTab, browser } from 'libs'
import Store from 'stores'

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
  focusedTab = null

  @observable
  typing = false

  @computed
  get matchedTabs () {
    return this.fuzzySearch()
  }

  @computed
  get matchedSet () {
    return new Set(this.matchedTabs.map(x => x.id))
  }

  @computed
  get matchedColumns () {
    return this.store.windowStore.columns.filter(column => {
      if (column.matchedTabs.length) {
        return column
      }
      return null
    })
  }

  @computed
  get focusedColIndex () {
    return this.matchedColumns.findIndex(column =>
      column.matchedTabs.find(tab => tab.id === this.focusedTab)
    )
  }

  @computed
  get focusedColumn () {
    if (this.focusedColIndex === -1) {
      return null
    }
    return this.matchedColumns[this.focusedColIndex]
  }

  @computed
  get focusedColTabIndex () {
    if (!this.focusedColumn) {
      return -1
    }
    return this.focusedColumn.matchedTabs.findIndex(
      tab => tab.id === this.focusedTab
    )
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
  defocusTab = () => {
    this.focusedTab = null
  }

  _handler = null

  @action
  search = (query, delay = 300) => {
    this.query = query
    if (!this.matchedSet.has(this.focusedTab)) {
      this.focusedTab = null
      this.findFocusedTab()
    }
    if (this._handler) {
      clearTimeout(this._handler)
    }
    this._handler = setTimeout(this.updateQuery, delay)
    if (this.store.userStore.preserveSearch) {
      browser.storage.local.set({ query })
    }
  }

  @action
  updateQuery = () => {
    this._query = this.query
  }

  @action
  clear = () => this.search('', 0)

  fuzzySearch = () => {
    const { tabs } = this.store.windowStore
    if (!this.query) {
      return tabs
    }
    const set = new Set(this.getMatchedIds(tabs, 'title'))
    if (this.store.userStore.showUrl) {
      this.getMatchedIds(tabs, 'url').forEach(x => set.add(x))
    }
    return tabs.filter(x => set.has(x.id))
  }

  getMatchedIds = (tabs, field) =>
    filter(this.query, tabs, { extract: x => x[field] }).map(x => x.original.id)

  @action
  enter = () => {
    activateTab(this.focusedTab)
  }

  @action
  focus = tab => {
    this.focusedTab = tab.id
  }

  @action
  select = () => {
    if (!this.focusedTab) {
      return
    }
    const {
      tabStore: { select },
      windowStore: { tabs }
    } = this.store
    select(tabs.find(x => x.id === this.focusedTab))
  }

  @action
  groupTab = () => {
    const tab = this.store.windowStore.tabs.find(x => x.id === this.focusedTab)
    if (tab) {
      tab.groupTab()
    }
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

  @action
  left = () => this.jumpToHorizontalTab(-1)

  @action
  right = () => this.jumpToHorizontalTab(1)

  jumpInSameCol = (direction, side = false) => {
    if (this.jumpOrFocusTab(direction)) {
      const { matchedTabs } = this.focusedColumn
      const { length } = matchedTabs
      let index = this.focusedColTabIndex + direction + length
      if (side) {
        index = direction * (length - 1)
      }
      this.focusedTab = matchedTabs[index % length].id
    }
  }

  jumpToHorizontalTab = direction => {
    if (this.jumpOrFocusTab(direction)) {
      const columns = this.matchedColumns
      const { length } = columns
      this.jumpToColumn(
        this.focusedColumn.getVisibleIndex(this.focusedTab),
        columns[(this.focusedColIndex + length + direction) % length]
      )
    }
  }

  jumpOrFocusTab = direction => {
    if (!this.focusedTab) {
      this.findFocusedTab()
      return
    }
    if (this.focusedColIndex < 0 || this.focusedColTabIndex < 0) {
      this.findFocusedTab(direction)
      return
    }
    if (!this.focusedTab) {
      this.jumpToTab(0)
      return
    }
    return true
  }

  jumpToColumn = (index, column) => {
    this.focusedTab = column.getTabIdForIndex(index)
  }

  @action
  up = () => this.jumpInSameCol(-1)

  @action
  down = () => this.jumpInSameCol(1)

  @action
  firstTab = () => this.jumpInSameCol(0, true)

  @action
  lastTab = () => this.jumpInSameCol(1, true)

  findFocusedTab = (step = 1) => {
    const { length } = this.matchedTabs
    if (length === 0) {
      return
    }
    if (this.focusedTab) {
      const index = this.matchedTabs.findIndex(x => x.id === this.focusedTab)
      this.jumpToTab(index + step)
    } else {
      const index = (length + (step - 1) / 2) % length
      this.jumpToTab(index)
    }
  }

  jumpToTab = (index = 0) => {
    const { length } = this.matchedTabs
    if (length === 0) {
      return
    }
    const newIndex = (length + index) % length
    this.focusedTab = this.matchedTabs[newIndex].id
  }
}
