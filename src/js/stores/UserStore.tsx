import { action, observable } from 'mobx'
import { browser } from 'libs'
import Store from 'stores'
import debounce from 'lodash.debounce'

const DEFAULT_SETTINGS = {
  showShortcutHint: true,
  showUnmatchedTab: true,
  toolbarAutoHide: false,
  highlightDuplicatedTab: true,
  showTabTooltip: true,
  preserveSearch: true,
  showUrl: true,
  autoFocusSearch: false,
  useSystemTheme: true,
  darkTheme: false,
  tabWidth: 20,
  showTabIcon: true
}

export default class UserStore {
  store: Store

  constructor (store) {
    this.store = store
    this.init()
  }

  init = async () => {
    const result = await browser.storage.sync.get(DEFAULT_SETTINGS)
    Object.assign(this, result)
    this.toolbarVisible = !this.toolbarAutoHide
    this.store.searchStore.init()
    this.loaded = true
  }

  @observable
  loaded = false

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

  @observable
  useSystemTheme = true

  @observable
  tabWidth = 20

  @observable
  showTabIcon = true

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
        ...Object.keys(DEFAULT_SETTINGS).map((key) => ({ [key]: this[key] }))
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
  updateTabWidth = (tabWidth) => {
    this.tabWidth = tabWidth
    this.save()
  }

  @action
  toggleShowTabIcon = () => {
    this.showTabIcon = !this.showTabIcon
    this.save()
  }

  @action
  toggleAutoHide = () => {
    this._hideToolbar.cancel()
    browser.storage.sync.set({ toolbarAutoHide: !this.toolbarAutoHide })
    this.init()
  }

  @action
  toggleDarkTheme = () => {
    if (this.useSystemTheme) {
      return
    }
    browser.storage.sync.set({ darkTheme: !this.darkTheme })
    this.init()
  }

  @action
  toggleUseSystemTheme = () => {
    browser.storage.sync.set({ useSystemTheme: !this.useSystemTheme })
    this.init()
  }

  @action
  lazyHideToolbar = () => {
    if (!this.toolbarAutoHide) {
      return
    }
    this._hideToolbar()
  }

  @action
  showToolbar = () => {
    if (!this.toolbarAutoHide) {
      return
    }
    this._hideToolbar.cancel()
    this.toolbarVisible = true
  }

  @action
  hideToolbar = () => {
    this.toolbarVisible = false
  }

  _hideToolbar = debounce(this.hideToolbar, 500)
}
