import { action, observable } from 'mobx'

const HOVERED_DELAY = 1000

export default class HoverStore {
  constructor (store) {
    this.store = store
  }

  hoverHandler = null

  @observable hoveredTabId = null
  // Hovered long enough with the delay
  @observable hovered = false

  @action
  hover = id => {
    this.hoveredTabId = id
    this.hovered = false
    if (this.hoverHandler != null) {
      clearTimeout(this.hoverHandler)
    }
    this.hoverHandler = setTimeout(this.updateHovered, HOVERED_DELAY)
  }

  @action
  unhover = () => {
    if (this.hoverHandler != null) {
      clearTimeout(this.hoverHandler)
    }
    this.hoveredTabId = null
    this.hovered = false
  }

  @action
  updateHovered = () => {
    this.hovered = true
  }
}
