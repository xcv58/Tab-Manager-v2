import {
  activateTab,
  setLastFocusedWindowId,
  browser,
  isSelfPopupTab,
  setSelfPopupActive,
} from 'libs'
import actions from 'libs/actions'
import log from 'libs/log'
import { setBrowserIcon } from 'libs/verify'

const STORAGE_KEY = 'tabHistory'

export default class TabHistory {
  actionMap: { [key: string]: () => void }

  constructor() {
    const { onActivated, onFocusChanged, onRemoved } = this
    browser.tabs.onActivated.addListener(onActivated)
    browser.tabs.onRemoved.addListener(onRemoved)
    browser.windows.onFocusChanged.addListener(onFocusChanged)
    this.actionMap = {
      [actions.lastActiveTab]: this.activateTab,
    }
    this.init()
  }

  tabHistory: any[] = []

  count = 0

  resetCountHandler: any = null

  expectedTabId: number | null = null

  // Flag to indicate if history has been loaded from storage
  loaded = false

  init = async () => {
    try {
      const data = await browser.storage.local.get({ [STORAGE_KEY]: [] })
      if (this.tabHistory.length === 0) {
        this.tabHistory = data[STORAGE_KEY] || []
      }
      this.loaded = true
      log.debug('TabHistory loaded from storage:', this.tabHistory)
    } catch (e) {
      log.error('Failed to load TabHistory from storage:', e)
      this.loaded = true
    }
  }

  save = async () => {
    if (!this.loaded) {
      return
    }
    try {
      // Limit history size to prevent storage quota issues (optional, but good practice)
      const MAX_HISTORY = 100
      const historyToSave = this.tabHistory.slice(-MAX_HISTORY)
      await browser.storage.local.set({ [STORAGE_KEY]: historyToSave })
    } catch (e) {
      log.error('Failed to save TabHistory to storage:', e)
    }
  }

  resetCount = () => {
    if (this.resetCountHandler != null) {
      clearTimeout(this.resetCountHandler)
    }
    this.resetCountHandler = setTimeout(this.reset, 1000)
  }

  reset = () => {
    const { length } = this.tabHistory
    const untouchedTabs = this.tabHistory.slice(0, this.nextTabIndex)
    const touchedTabs = this.tabHistory
      .slice(this.nextTabIndex, length - 1)
      .reverse()
    const lastTab = this.tabHistory[length - 1]
    this.tabHistory = [...untouchedTabs, ...touchedTabs, lastTab]
    this.count = 0
    this.resetCountHandler = null
    this.save()
  }

  add = ({ tabId, windowId, ...rest }) => {
    if (!tabId || windowId === -1) {
      return
    }
    this.remove(tabId, false) // pass false to avoid double save
    this.tabHistory.push({ tabId, windowId, ...rest })
    this.save()
  }

  remove = (tabId, shouldSave = true) => {
    const index = this.tabHistory.findIndex((x) => x.tabId === tabId)
    if (index !== -1) {
      this.tabHistory.splice(index, 1)
      if (shouldSave) {
        this.save()
      }
    }
  }

  get nextTabIndex() {
    return Math.max(this.tabHistory.length - 1 - this.count, 0)
  }

  activateTab = async () => {
    // Ensure loaded before trying to activate
    if (!this.loaded) {
      await this.init()
    }

    this.count += 1
    this.resetCount()
    if (this.tabHistory.length > 1) {
      const { tabId } = this.tabHistory[this.nextTabIndex]
      this.expectedTabId = tabId
      activateTab(tabId, true)
    }
  }

  onActivated = async (activeInfo) => {
    const { tabId, windowId } = activeInfo
    if (tabId !== this.expectedTabId) {
      const { length } = this.tabHistory
      if (this.resetCountHandler) {
        this.resetCount()
        const index = this.tabHistory.findIndex((x) => x.tabId === tabId)
        if (index < length - this.count) {
          this.count += 1
        }
      }
    }
    this.expectedTabId = null
    try {
      const tab = await browser.tabs.get(tabId)
      this.add({ ...tab, tabId, windowId })
    } catch (e) {
      // Tab might not exist anymore
      log.warn('Failed to get tab info in onActivated:', e)
    }
  }

  onFocusChanged = async (windowId) => {
    setBrowserIcon()
    log.debug('onFocusChanged:', { windowId })
    if (windowId < 0) {
      return setSelfPopupActive(false)
    }
    try {
      const [tab] = await browser.tabs.query({ active: true, windowId })
      if (!tab) {
        log.debug('onFocusChanged does nothing since no tab')
        return setSelfPopupActive(false)
      }
      const isPopupWindow = isSelfPopupTab(tab)
      if (isPopupWindow) {
        log.debug('onFocusChanged ignore self popup window', {
          tab,
          isPopupWindow,
        })
        return setSelfPopupActive(true)
      }
      log.debug('onFocusChanged record the window', {
        windowId,
        tab,
        isPopupWindow,
      })
      this.add({ ...tab, tabId: tab.id, windowId })
      setLastFocusedWindowId(windowId)
    } catch (e) {
      log.warn('Error in onFocusChanged:', e)
    }
  }

  onRemoved = async (tabId) => this.remove(tabId)
}
