import { action, observable, computed, makeObservable } from 'mobx'
import { browser } from 'libs'
import Store from 'stores'
import debounce from 'lodash.debounce'
import log from 'libs/log'
import {
  captureDialogFocusTarget,
  restoreDialogFocusTarget,
} from 'libs/dialogFocus'

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

const LEGACY_SETTINGS = ['groupByDomain'] as const
const SETTINGS_KEYS = [...Object.keys(DEFAULT_SETTINGS), ...LEGACY_SETTINGS]

export const stripLegacySettings = (settings: { [key: string]: unknown }) => {
  const nextSettings = {
    ...DEFAULT_SETTINGS,
    ...settings,
  }
  const legacyKeys: string[] = []

  LEGACY_SETTINGS.forEach((key) => {
    if (key in nextSettings) {
      legacyKeys.push(key)
      delete nextSettings[key]
    }
  })

  return {
    settings: nextSettings,
    legacyKeys,
  }
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
      const storedSettings = await browser.storage.sync.get(SETTINGS_KEYS)
      return this.normalizeStoredSettings(storedSettings, 'sync')
    } catch (error) {
      log.warn('UserStore.readSettings fallback to storage.local', { error })
      try {
        const storedSettings = await browser.storage.local.get(SETTINGS_KEYS)
        return this.normalizeStoredSettings(storedSettings, 'local')
      } catch (localError) {
        log.error('UserStore.readSettings fallback failed', { localError })
        return DEFAULT_SETTINGS
      }
    }
  }

  normalizeStoredSettings = (
    settings: { [key: string]: unknown },
    area: 'sync' | 'local',
  ) => {
    const { settings: normalizedSettings, legacyKeys } =
      stripLegacySettings(settings)
    if (legacyKeys.length > 0) {
      void this.clearLegacySettings(legacyKeys, area)
    }
    return normalizedSettings
  }

  clearLegacySettings = async (
    keys: string[],
    area: 'sync' | 'local',
  ): Promise<void> => {
    try {
      await browser.storage[area].remove?.(keys)
      log.info('UserStore removed legacy settings', { area, keys })
    } catch (error) {
      log.warn('UserStore failed to remove legacy settings', {
        area,
        keys,
        error,
      })
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
    const previousFontSize = this.fontSize
    const previousTabWidth = this.tabWidth
    try {
      const result = await this.readSettings()
      Object.assign(this, result)
      if (
        this.store.windowStore &&
        (this.fontSize !== previousFontSize ||
          this.tabWidth !== previousTabWidth)
      ) {
        this.store.windowStore.repackLayout('settings-change')
      }
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
  dialogFocusTarget: HTMLElement | null = null
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
    this.dialogFocusTarget = captureDialogFocusTarget()
    this.dialogOpen = true
  }

  closeDialog = () => {
    this.dialogOpen = false
    restoreDialogFocusTarget(this.dialogFocusTarget)
    this.dialogFocusTarget = null
  }

  toggleDialog = () => {
    if (this.dialogOpen) {
      this.closeDialog()
      return
    }
    this.openDialog()
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
