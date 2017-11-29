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
  }

  @action
  toggleAutoHide = () => {
    this.toolbarAutoHide = !this.toolbarAutoHide
    setToolbarAutoHide(this.toolbarAutoHide)
  }

  @action
  hideToolbar = () => {
    this._clearHideToolbarHandler()
    this.hideToolbarHandler = setTimeout(this._hideToolbar, 2000)
  }

  @action
  showToolbar = () => {
    this._clearHideToolbarHandler()
    this.toolbarVisible = true
  }

  _clearHideToolbarHandler = () => {
    if (this.hideToolbarHandler != null) {
      clearTimeout(this.hideToolbarHandler)
    }
    this.hideToolbarHandler = null
  }

  _hideToolbar = () => {
    this.toolbarVisible = false
  }
}
