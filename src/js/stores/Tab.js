import { action, computed, observable } from 'mobx'

export default class Tab {
  constructor (tab, store) {
    this.store = store
    Object.assign(this, tab)
  }

  @observable isHovered = false

  @action
  hover = () => {
    this.isHovered = true
  }

  @action
  unhover = () => {
    this.isHovered = false
  }

  @computed
  get isMatched () {
    return this.store.searchStore.matchedSet.has(this.id)
  }

  @computed
  get isFocused () {
    return this.id === this.store.searchStore.focusedTab
  }

  @computed
  get isSelected () {
    return this.store.tabStore.selection.has(this.id)
  }
}
