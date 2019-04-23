import { action, observable } from 'mobx'
import { browser } from 'libs'

const DEFAULT_SETTINGS = {
  showShortcutHint: true,
  showUnmatchedTab: true,
  toolbarAutoHide: false,
  highlightDuplicatedTab: true,
  showTabTooltip: true,
  preserveSearch: true,
  showUrl: true,
  autoFocusSearch: false,
  darkTheme: false
}

export default class UserStore {
  constructor (store) {
    this.store = store
    this.init()
  }

  init = async () => {
    const result = await browser.storage.sync.get(DEFAULT_SETTINGS)
    Object.assign(this, result)
    this.toolbarVisible = !this.toolbarAutoHide
    this.store.searchStore.init()
  }

  @observable
  showShortcutHint
  @observable
  showUnmatchedTab
  @observable
  toolbarAutoHide
  @observable
  highlightDuplicatedTab
  @observable
  showTabTooltip
  @observable
  preserveSearch
  @observable
  showUrl
  @observable
  autoFocusSearch

  @observable
  dialogOpen = false

  @observable
  toolbarVisible

  @observable
  darkTheme = false

  hideToolbarHandler = null

  @action
  openDialog = () => {
    this.dialogOpen = true
  }

  @action
  closeDialog = () => {
    this.dialogOpen = false
  }

  @action
  toggleDialog = () => {
    this.dialogOpen = !this.dialogOpen
  }

  save = () => {
    browser.storage.sync.set(
      Object.assign(
        ...Object.keys(DEFAULT_SETTINGS).map(key => ({ [key]: this[key] }))
      )
    )
  }

  @action
  toggleHighlightDuplicatedTab = () => {
    this.highlightDuplicatedTab = !this.highlightDuplicatedTab
    this.save()
  }

  @action
  toggleShowShortcutHint = () => {
    this.showShortcutHint = !this.showShortcutHint
    this.save()
  }

  @action
  toggleShowTabTooltip = () => {
    this.showTabTooltip = !this.showTabTooltip
    this.save()
  }

  @action
  togglePreserveSearch = () => {
    this.preserveSearch = !this.preserveSearch
    this.save()
  }

  @action
  toggleShowUnmatchedTab = () => {
    this.showUnmatchedTab = !this.showUnmatchedTab
    this.save()
  }

  @action
  toggleAutoFocusSearch = () => {
    this.autoFocusSearch = !this.autoFocusSearch
    this.save()
  }

  @action
  toggleShowUrl = () => {
    this.showUrl = !this.showUrl
    this.save()
  }

  @action
  toggleAutoHide = () => {
    this._clearHideToolbarHandler()
    browser.storage.sync.set({ toolbarAutoHide: !this.toolbarAutoHide })
    this.init()
  }

  @action
  toggleDarkTheme = () => {
    browser.storage.sync.set({ darkTheme: !this.darkTheme })
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
