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
      hover: action,
      unhover: action,
    })

    this.store = store
  }

  hoveredTabId: number = null

  // Hovered long enough with the delay
  hovered = false

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
    if (this.hoveredTabId === id) {
      return
    }
    this.getTabById(this.hoveredTabId)?.setHovered(false)
    this.hoveredTabId = id
    this.getTabById(id)?.setHovered(true)
    if (!this.store.userStore.showTabTooltip) {
      return
    }
    this.hovered = false
    this._updateHovered()
  }

  unhover = () => {
    this._updateHovered.cancel()
    this.getTabById(this.hoveredTabId)?.setHovered(false)
    this.hoveredTabId = null
    this.hovered = false
  }

  _updateHovered = debounce(() => {
    this.hovered = true
  }, HOVERED_DELAY)
}
