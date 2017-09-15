import { activateTab } from '../libs'
import actions from '../libs/actions'

export default class TabHistory {
  constructor (background) {
    this.root = background
    const { onActivated, onFocusChanged, onRemoved } = this
    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onRemoved.addListener(onRemoved)
    chrome.windows.onFocusChanged.addListener(onFocusChanged)
    this.actionMap = {
      [actions.lastActiveTab()]: this.activateTab
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
    this.resetCountHandler = setTimeout(
      () => {
        const { length } = this.tabHistory
        const index = Math.max(length - 1 - this.count, 0)
        const untouchedTabs = this.tabHistory.slice(0, index)
        const touchedTabs = this.tabHistory.slice(index, length - 1).reverse()
        const lastTab = this.tabHistory[length - 1]
        this.tabHistory = [ ...untouchedTabs, ...touchedTabs, lastTab ]
        this.count = 0
        this.resetCountHandler = null
      },
      1000
    )
  }

  add = ({ tabId, windowId, title }) => {
    if (!tabId || windowId === -1) {
      return
    }
    this.remove(tabId)
    this.tabHistory.push({ tabId, windowId, title })
  }

  remove = (tabId) => {
    const index = this.tabHistory.findIndex(x => x.tabId === tabId)
    if (index !== -1) {
      this.tabHistory.splice(index, 1)
    }
  }

  activateTab = () => {
    this.count += 1
    this.resetCount()
    const { length } = this.tabHistory
    if (length > 1) {
      const index = Math.max(length - 1 - this.count, 0)
      const { tabId } = this.tabHistory[index]
      this.expectedTabId = tabId
      activateTab(tabId)
    }
  }

  onActivated = async (activeInfo) => {
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
    const tab = await chrome.tabs.get(tabId)
    this.add({ tabId, windowId, title: tab.title })
  }

  onFocusChanged = async (windowId) => {
    const tab = await chrome.tabs.query({ active: true, windowId })
    if (tab.length === 0) {
      return
    }
    this.add({ tabId: tab.id, windowId, title: tab[0].title })
  }

  onRemoved = async (tabId) => {
    this.remove(tabId)
  }
}
