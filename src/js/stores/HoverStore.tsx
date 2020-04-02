import { action, observable } from 'mobx'
import Store from 'stores'
import debounce from 'lodash.debounce'

const HOVERED_DELAY = 896.4

// This store is for individual tab's tooltip.
export default class HoverStore {
  store: Store

  constructor (store) {
    this.store = store
  }

  @observable
  hoveredTabId = null

  // Hovered long enough with the delay
  @observable
  hovered = false

  @action
  hover = (id) => {
    if (this.hoveredTabId === id) {
      return
    }
    this.hoveredTabId = id
    if (!this.store.userStore.showTabTooltip) {
      return
    }
    this.hovered = false
    this._updateHovered()
  }

  @action
  unhover = () => {
    this._updateHovered.cancel()
    this.hoveredTabId = null
    this.hovered = false
  }

  _updateHovered = debounce(() => {
    this.hovered = true
  }, HOVERED_DELAY)
}
