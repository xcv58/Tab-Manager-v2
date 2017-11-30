import { action, observable } from 'mobx'
import { getToolbarAutoHide, setToolbarAutoHide } from 'libs'

export default class UserStore {
  constructor (store) {
    this.store = store
    this.init()
  }

  @observable toolbarAutoHide = false
  @observable toolbarVisible = false
  hideToolbarHandler = null

  init = async () => {
    this.toolbarAutoHide = await getToolbarAutoHide()
    this.toolbarVisible = !this.toolbarAutoHide
  }

  @action
  toggleAutoHide = () => {
    this._clearHideToolbarHandler()
    setToolbarAutoHide(!this.toolbarAutoHide)
    this.init()
  }

  @action
  lazyHideToolbar = () => {
    if (!this.toolbarAutoHide) {
      return
    }
    this._clearHideToolbarHandler()
    this.hideToolbarHandler = setTimeout(this.hideToolbar, 500)
  }

  @action
  showToolbar = () => {
    if (!this.toolbarAutoHide) {
      return
    }
    this._clearHideToolbarHandler()
    this.toolbarVisible = true
  }

  @action
  hideToolbar = () => {
    if (!this.toolbarAutoHide) {
      return
    }
    this.toolbarVisible = false
  }

  _clearHideToolbarHandler = () => {
    if (this.hideToolbarHandler != null) {
      clearTimeout(this.hideToolbarHandler)
    }
    this.hideToolbarHandler = null
  }
}
