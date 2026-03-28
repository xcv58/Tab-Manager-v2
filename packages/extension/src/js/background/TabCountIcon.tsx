import { browser } from 'libs'
import { setBrowserIcon } from 'libs/verify'

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
  constructor() {
    browser.tabs.onCreated.addListener(this.refreshIcon)
    browser.tabs.onRemoved.addListener(this.refreshIcon)
    browser.tabs.onAttached.addListener(this.refreshIcon)
    browser.tabs.onDetached.addListener(this.refreshIcon)
    browser.windows.onFocusChanged.addListener(this.refreshIcon)
    browser.storage.onChanged.addListener(this.onStorageChanged)
  }

  refreshIcon = () => setBrowserIcon()

  onStorageChanged = (
    changes: StorageChangeMap,
    areaName: string,
  ): Promise<void> | undefined => {
    if (areaName !== 'local' && areaName !== 'sync') {
      return
    }

    const shouldRefresh = RELEVANT_STORAGE_KEYS[areaName].some(
      (key) => key in changes,
    )
    if (!shouldRefresh) {
      return
    }

    return setBrowserIcon()
  }
}
