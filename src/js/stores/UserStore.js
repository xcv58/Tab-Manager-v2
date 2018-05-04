import { action, observable } from 'mobx'

export default class UserStore {
  constructor (store) {
    this.store = store
    this.init()
  }

  @observable toolbarAutoHide
  @observable highlightDuplicatedTab

  @observable toolbarVisible

  @observable dialogOpen = false

  @action
  openDialog = () => {
    this.dialogOpen = true
  }

  @action
  closeDialog = () => {
    this.dialogOpen = false
  }

  hideToolbarHandler = null

  init = async () => {
    const result = await chrome.storage.sync.get({
      toolbarAutoHide: false,
      highlightDuplicatedTab: true
    })
    Object.assign(this, result)
    this.toolbarVisible = !this.toolbarAutoHide
  }

  save = () => {
    const { highlightDuplicatedTab, toolbarAutoHide } = this
    chrome.storage.sync.set({ highlightDuplicatedTab, toolbarAutoHide })
  }

  @action
  toggleHighlightDuplicatedTab = () => {
    this.highlightDuplicatedTab = !this.highlightDuplicatedTab
    this.save()
  }

  @action
  toggleAutoHide = () => {
    this._clearHideToolbarHandler()
    chrome.storage.sync.set({ toolbarAutoHide: !this.toolbarAutoHide })
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
