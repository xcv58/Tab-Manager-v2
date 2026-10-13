import { action, observable, makeObservable } from 'mobx'
import Store from 'stores'
import debounce from 'lodash.debounce'
import type Tab from './Tab'

const HOVERED_DELAY = 896.4

// This store is for individual tab's tooltip.
export default class HoverStore {
  store: Store

  constructor(store: Store) {
    makeObservable(this, {
      hoveredTabId: observable,
      hovered: observable,
      keyboardEntry: observable,
      hover: action,
      unhover: action,
      openTooltip: action,
      hideTooltip: action,
    })

    this.store = store
  }

  hoveredTabId: number = null

  // Hovered long enough with the delay
  hovered = false

  keyboardEntry = false

  private tooltipHeld = false

  getTabById = (id: number | null): Tab | null => {
    if (id == null) {
      return null
    }
    for (const win of this.store.windowStore.windows) {
      const tab = win.getTabById(id)
      if (tab) {
        return tab
      }
    }
    return null
  }

  hover = (id: number) => {
    this._closeTooltip.cancel()
    if (this.hoveredTabId === id) {
      return
    }
    this.getTabById(this.hoveredTabId)?.setHovered(false)
    this.tooltipHeld = false
    this.keyboardEntry = false
    this.hoveredTabId = id
    this.getTabById(id)?.setHovered(true)
    if (!this.store.userStore.showTabTooltip) {
      return
    }
    this.hovered = false
    this._updateHovered()
  }

  unhover = (id = this.hoveredTabId) => {
    if (id !== this.hoveredTabId || this.tooltipHeld) return
    if (this.hovered) {
      this._closeTooltip()
    } else {
      this.hideTooltip(id)
    }
  }

  openTooltip = (id: number, keyboardEntry = false) => {
    if (!this.store.userStore.showTabTooltip) return
    this.hover(id)
    this._updateHovered.cancel()
    this.keyboardEntry = keyboardEntry
    this.hovered = true
  }

  holdTooltip = (id: number) => {
    if (id !== this.hoveredTabId) return
    this._closeTooltip.cancel()
    this.tooltipHeld = true
  }

  releaseTooltip = (id: number, returnedToRow = false) => {
    if (id !== this.hoveredTabId) return
    this.tooltipHeld = false
    if (!returnedToRow) this.unhover(id)
  }

  hideTooltip = (id = this.hoveredTabId) => {
    if (id !== this.hoveredTabId) return
    this._closeTooltip.cancel()
    this._updateHovered.cancel()
    this.tooltipHeld = false
    this.keyboardEntry = false
    this.getTabById(this.hoveredTabId)?.setHovered(false)
    this.hoveredTabId = null
    this.hovered = false
  }

  private _closeTooltip = debounce(() => this.hideTooltip(), 240)

  _updateHovered = debounce(() => {
    this.hovered = true
  }, HOVERED_DELAY)
}
