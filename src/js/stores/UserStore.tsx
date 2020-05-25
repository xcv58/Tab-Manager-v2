import { action, observable, computed } from 'mobx'
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

const SYSTEM = 'system'
const DARK = 'dark'
const LIGHT = 'light'
export const THEMES = [SYSTEM, DARK, LIGHT]

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

  @computed
  get theme () {
    if (this.useSystemTheme) {
      return SYSTEM
    }
    if (this.darkTheme) {
      return DARK
    }
    return LIGHT
  }

  @action
  selectTheme = (theme) => {
    if (theme === SYSTEM) {
      this.useSystemTheme = true
    } else {
      this.useSystemTheme = false
      this.darkTheme = theme === DARK
    }
    browser.storage.sync.set({
      useSystemTheme: this.useSystemTheme,
      darkTheme: this.darkTheme
    })
  }

  @action
  selectNextTheme = () => {
    const index = THEMES.findIndex((t) => t === this.theme)
    const nextIndex = (index + 1) % THEMES.length
    this.selectTheme(THEMES[nextIndex])
  }

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
        {},
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
  toggleDarkTheme = (currentTheme) => {
    browser.storage.sync.set({
      useSystemTheme: false,
      darkTheme: !currentTheme
    })
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
