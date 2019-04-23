import { activateTab, popupURL, setLastFocusedWindowId, browser } from 'libs'
import actions from 'libs/actions'

export default class TabHistory {
  constructor (background) {
    this.root = background
    const { onActivated, onFocusChanged, onRemoved } = this
    browser.tabs.onActivated.addListener(onActivated)
    browser.tabs.onRemoved.addListener(onRemoved)
    browser.windows.onFocusChanged.addListener(onFocusChanged)
    this.actionMap = {
      [actions.lastActiveTab]: this.activateTab
    }
  }

  tabHistory = []
  count = 0
  resetCountHandler = null
  expectedTabId = null

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
  }

  add = ({ tabId, windowId, ...rest }) => {
    if (!tabId || windowId === -1) {
      return
    }
    this.remove(tabId)
    this.tabHistory.push({ tabId, windowId, ...rest })
  }

  remove = tabId => {
    const index = this.tabHistory.findIndex(x => x.tabId === tabId)
    if (index !== -1) {
      this.tabHistory.splice(index, 1)
    }
  }

  get nextTabIndex () {
    return Math.max(this.tabHistory.length - 1 - this.count, 0)
  }

  activateTab = () => {
    this.count += 1
    this.resetCount()
    if (this.tabHistory.length > 1) {
      const { tabId } = this.tabHistory[this.nextTabIndex]
      this.expectedTabId = tabId
      activateTab(tabId)
    }
  }

  onActivated = async activeInfo => {
    const { tabId, windowId } = activeInfo
    if (tabId !== this.expectedTabId) {
      const { length } = this.tabHistory
      if (this.resetCountHandler) {
        this.resetCount()
        const index = this.tabHistory.findIndex(x => x.tabId === tabId)
        if (index < length - this.count) {
          this.count += 1
        }
      }
    }
    this.expectedTabId = null
    const tab = await browser.tabs.get(tabId)
    this.add({ ...tab, tabId, windowId })
  }

  onFocusChanged = async windowId => {
    if (windowId < 0) {
      return
    }
    const [tab] = await browser.tabs.query({ active: true, windowId })
    if (!tab) {
      return
    }
    if (tab.url === popupURL) {
      return
    }
    this.add({ ...tab, tabId: tab.id, windowId })
    setLastFocusedWindowId(windowId)
  }

  onRemoved = async tabId => this.remove(tabId)
}
