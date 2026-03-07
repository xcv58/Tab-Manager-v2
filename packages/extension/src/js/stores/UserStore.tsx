import { action, observable, computed, makeObservable } from 'mobx'
import { browser } from 'libs'
import Store from 'stores'
import debounce from 'lodash.debounce'
import log from 'libs/log'

const DEFAULT_SETTINGS = {
  showAppWindow: false,
  showShortcutHint: true,
  showUnmatchedTab: true,
  litePopupMode: false,
  toolbarAutoHide: false,
  highlightDuplicatedTab: true,
  showTabTooltip: true,
  preserveSearch: true,
  searchHistory: true,
  showUrl: true,
  autoFocusSearch: false,
  ignoreHash: false,
  useSystemTheme: true,
  darkTheme: false,
  tabWidth: 20,
  showTabIcon: true,
  fontSize: 14,
}

const SYSTEM = 'system'
const DARK = 'dark'
const LIGHT = 'light'
export const THEMES = [SYSTEM, DARK, LIGHT]

export default class UserStore {
  store: Store

  constructor(store: Store) {
    // makeAutoObservable(this)
    makeObservable(this, {
      loaded: observable,
      showAppWindow: observable,
      showShortcutHint: observable,
      showUnmatchedTab: observable,
      litePopupMode: observable,
      toolbarAutoHide: observable,
      highlightDuplicatedTab: observable,
      showTabTooltip: observable,
      preserveSearch: observable,
      searchHistory: observable,
      showUrl: observable,
      autoFocusSearch: observable,
      dialogOpen: observable,
      toolbarVisible: observable,
      darkTheme: observable,
      useSystemTheme: observable,
      tabWidth: observable,
      showTabIcon: observable,
      ignoreHash: observable,
      fontSize: observable,
      theme: computed,
      selectTheme: action,
      selectNextTheme: action,
      openDialog: action,
      closeDialog: action,
      toggleDialog: action,
      toggleHighlightDuplicatedTab: action,
      toggleShowShortcutHint: action,
      toggleShowTabTooltip: action,
      togglePreserveSearch: action,
      toggleSearchHistory: action,
      toggleShowUnmatchedTab: action,
      toggleAutoFocusSearch: action,
      toggleShowUrl: action,
      updateTabWidth: action,
      updateFontSize: action,
      toggleShowTabIcon: action,
      toggleAutoHide: action,
      toggleDarkTheme: action,
      toggleUseSystemTheme: action,
      lazyHideToolbar: action,
      showToolbar: action,
      hideToolbar: action,
    })

    this.store = store
    this.init()
  }

  readSettings = async (): Promise<{ [key: string]: unknown }> => {
    try {
      return await browser.storage.sync.get(DEFAULT_SETTINGS)
    } catch (error) {
      log.warn('UserStore.readSettings fallback to storage.local', { error })
      try {
        return await browser.storage.local.get(DEFAULT_SETTINGS)
      } catch (localError) {
        log.error('UserStore.readSettings fallback failed', { localError })
        return DEFAULT_SETTINGS
      }
    }
  }

  writeSettings = async (settings: { [key: string]: unknown }) => {
    try {
      await browser.storage.sync.set(settings)
    } catch (error) {
      log.warn('UserStore.writeSettings fallback to storage.local', { error })
      try {
        await browser.storage.local.set(settings)
      } catch (localError) {
        log.error('UserStore.writeSettings fallback failed', { localError })
      }
    }
  }

  init = async () => {
    try {
      const result = await this.readSettings()
      Object.assign(this, result)
    } catch (error) {
      log.error('UserStore.init failed to load settings', { error })
    } finally {
      this.toolbarVisible = !this.toolbarAutoHide
      this.store.searchStore?.init?.()
      this.loaded = true
    }
  }

  loaded = false

  showAppWindow = false
  showShortcutHint = true
  showUnmatchedTab = true
  litePopupMode = false
  toolbarAutoHide = false
  highlightDuplicatedTab = true
  showTabTooltip = true
  preserveSearch = true
  searchHistory = true
  showUrl = true
  autoFocusSearch = false
  useSystemTheme = true
  darkTheme = false
  tabWidth = 20
  fontSize = 14
  showTabIcon = true
  dialogOpen = false
  toolbarVisible = true
  ignoreHash = false

  get theme() {
    if (this.useSystemTheme) {
      return SYSTEM
    }
    if (this.darkTheme) {
      return DARK
    }
    return LIGHT
  }

  selectTheme = (theme: string) => {
    if (theme === SYSTEM) {
      this.useSystemTheme = true
    } else {
      this.useSystemTheme = false
      this.darkTheme = theme === DARK
    }
    this.writeSettings({
      useSystemTheme: this.useSystemTheme,
      darkTheme: this.darkTheme,
    })
  }

  selectNextTheme = () => {
    const index = THEMES.findIndex((t) => t === this.theme)
    const nextIndex = (index + 1) % THEMES.length
    this.selectTheme(THEMES[nextIndex])
  }

  openDialog = () => {
    this.dialogOpen = true
  }

  closeDialog = () => {
    this.dialogOpen = false
  }

  toggleDialog = () => {
    this.dialogOpen = !this.dialogOpen
  }

  save = () => {
    this.writeSettings(
      Object.assign(
        {},
        ...Object.keys(DEFAULT_SETTINGS).map((key) => ({ [key]: this[key] })),
      ),
    )
  }

  toggleHighlightDuplicatedTab = () => {
    this.highlightDuplicatedTab = !this.highlightDuplicatedTab
    this.save()
  }

  toggleShowAppWindow = () => {
    this.showAppWindow = !this.showAppWindow
    this.save()
    this.store.windowStore.loadAllWindows({
      repackPolicy: 'always',
      reason: 'settings-change',
    })
  }

  toggleShowShortcutHint = () => {
    this.showShortcutHint = !this.showShortcutHint
    this.save()
  }

  toggleShowTabTooltip = () => {
    this.showTabTooltip = !this.showTabTooltip
    this.save()
  }

  toggleIgnoreHash = () => {
    this.ignoreHash = !this.ignoreHash
    this.save()
  }

  togglePreserveSearch = () => {
    this.preserveSearch = !this.preserveSearch
    this.save()
  }

  toggleSearchHistory = () => {
    this.searchHistory = !this.searchHistory
    this.save()
  }

  toggleShowUnmatchedTab = () => {
    this.showUnmatchedTab = !this.showUnmatchedTab
    this.store.windowStore?.repackLayout?.('filter-change')
    this.save()
  }

  toggleLitePopupMode = () => {
    this.litePopupMode = !this.litePopupMode
    this.save()
  }

  toggleAutoFocusSearch = () => {
    this.autoFocusSearch = !this.autoFocusSearch
    this.save()
  }

  toggleShowUrl = () => {
    this.showUrl = !this.showUrl
    this.save()
  }

  updateTabWidth = (tabWidth: number) => {
    this.tabWidth = tabWidth
    this.store.windowStore?.repackLayout?.('settings-change')
    this.save()
  }

  updateFontSize = (fontSize: number) => {
    this.fontSize = fontSize
    this.store.windowStore?.repackLayout?.('settings-change')
    this.save()
  }

  toggleShowTabIcon = () => {
    this.showTabIcon = !this.showTabIcon
    this.save()
  }

  toggleAutoHide = () => {
    this._hideToolbar.cancel()
    this.writeSettings({ toolbarAutoHide: !this.toolbarAutoHide })
    this.init()
  }

  toggleDarkTheme = (currentTheme: boolean) => {
    this.writeSettings({
      useSystemTheme: false,
      darkTheme: !currentTheme,
    })
    this.init()
  }

  toggleUseSystemTheme = () => {
    this.writeSettings({ useSystemTheme: !this.useSystemTheme })
    this.init()
  }

  lazyHideToolbar = () => {
    if (!this.toolbarAutoHide) {
      return
    }
    this._hideToolbar()
  }

  showToolbar = () => {
    if (!this.toolbarAutoHide) {
      return
    }
    this._hideToolbar.cancel()
    this.toolbarVisible = true
  }

  hideToolbar = () => {
    this.toolbarVisible = false
  }

  _hideToolbar = debounce(this.hideToolbar, 500)
}
