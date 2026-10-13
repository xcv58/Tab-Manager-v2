import { action, observable, makeObservable } from 'mobx'
import Store from 'stores'
import debounce from 'lodash.debounce'
import type Tab from './Tab'

const HOVERED_DELAY = 896.4
export type TabTooltipSurface = 'list' | 'search'

// This store is for individual tab's tooltip.
export default class HoverStore {
  store: Store

  constructor(store: Store) {
    makeObservable(this, {
      hoveredTabId: observable,
      hovered: observable,
      keyboardEntry: observable,
      hoveredSurface: observable,
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
  hoveredSurface: TabTooltipSurface = 'list'

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

  hover = (id: number, surface: TabTooltipSurface = 'list') => {
    if (this.hoveredTabId === id && this.hoveredSurface === surface) {
      this._closeTooltip.cancel()
      return
    }
    // Resizing an interactive card can expose another row beneath the pointer.
    // That incidental hover must not replace the card being read or copied.
    if (this.hovered && this.tooltipHeld) return
    this._closeTooltip.cancel()
    this.getTabById(this.hoveredTabId)?.setHovered(false)
    this.tooltipHeld = false
    this.keyboardEntry = false
    this.hoveredTabId = id
    this.hoveredSurface = surface
    this.getTabById(id)?.setHovered(true)
    if (!this.store.userStore.showTabTooltip) {
      return
    }
    this.hovered = false
    this._updateHovered()
  }

  unhover = (id = this.hoveredTabId, surface: TabTooltipSurface = 'list') => {
    if (
      id !== this.hoveredTabId ||
      surface !== this.hoveredSurface ||
      this.tooltipHeld
    )
      return
    if (this.hovered) {
      this._closeTooltip()
    } else {
      this.hideTooltip(id)
    }
  }

  openTooltip = (
    id: number,
    keyboardEntry = false,
    surface: TabTooltipSurface = 'list',
  ) => {
    if (!this.store.userStore.showTabTooltip) return
    // Explicit keyboard entry can intentionally move to another tab or surface.
    if (id !== this.hoveredTabId || surface !== this.hoveredSurface)
      this.hideTooltip()
    this.hover(id, surface)
    this._updateHovered.cancel()
    this.keyboardEntry = keyboardEntry
    this.hovered = true
  }

  holdTooltip = (id: number, surface: TabTooltipSurface = 'list') => {
    if (id !== this.hoveredTabId || surface !== this.hoveredSurface) return
    this._closeTooltip.cancel()
    this.tooltipHeld = true
  }

  releaseTooltip = (
    id: number,
    returnedToRow = false,
    surface: TabTooltipSurface = 'list',
  ) => {
    if (id !== this.hoveredTabId || surface !== this.hoveredSurface) return
    this.tooltipHeld = false
    if (!returnedToRow) this.unhover(id, surface)
  }

  hideTooltip = (id = this.hoveredTabId, surface?: TabTooltipSurface) => {
    if (
      id !== this.hoveredTabId ||
      (surface && surface !== this.hoveredSurface)
    )
      return
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
