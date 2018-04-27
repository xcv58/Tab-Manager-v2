import { action, observable } from 'mobx'

export default class HoverStore {
  constructor (store) {
    this.store = store
  }

  @observable hoveredTabId = null

  @action
  hover = id => {
    this.hoveredTabId = id
  }

  @action
  unhover = () => {
    this.hoveredTabId = null
  }
}
