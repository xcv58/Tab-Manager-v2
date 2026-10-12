import { browser } from 'libs'
import { setBrowserIcon } from 'libs/verify'
import log from 'libs/log'

type StorageChangeMap = Record<
  string,
  {
    oldValue?: unknown
    newValue?: unknown
  }
>

const RELEVANT_STORAGE_KEYS = {
  local: ['actionTabCountMode', 'lastFocusedWindowId', 'systemTheme'] as const,
  sync: ['actionTabCountMode'] as const,
}

export default class TabCountIcon {
  refreshTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    browser.tabs.onCreated.addListener(this.refreshIcon)
    browser.tabs.onRemoved.addListener(this.refreshIcon)
    browser.tabs.onAttached.addListener(this.refreshIcon)
    browser.tabs.onDetached.addListener(this.refreshIcon)
    browser.windows.onFocusChanged.addListener(this.refreshIcon)
    browser.windows.onRemoved?.addListener?.(this.refreshIcon)
    browser.storage.onChanged.addListener(this.onStorageChanged)
  }

  refreshIcon = () => {
    if (this.refreshTimer != null) return
    // Coalesce event bursts without postponing updates indefinitely while tabs
    // continue changing. Direct callers still await setBrowserIcon normally.
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null
      void setBrowserIcon().catch((error) =>
        log.warn('Icon refresh failed', error),
      )
    }, 80)
  }

  onStorageChanged = (changes: StorageChangeMap, areaName: string): void => {
    if (areaName !== 'local' && areaName !== 'sync') {
      return
    }

    const shouldRefresh = RELEVANT_STORAGE_KEYS[areaName].some(
      (key) => key in changes,
    )
    if (!shouldRefresh) {
      return
    }

    this.refreshIcon()
  }
}
