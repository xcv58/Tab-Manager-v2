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
      const index = length - 1 - this.count
      if (index < 0) {
        this.count = 0
        const tabs = this.tabHistory.slice(0, length - 1).reverse()
        this.tabHistory = [ ...tabs, this.tabHistory[length - 1] ]
        return this.activateTab()
      }
      activateTab(this.tabHistory[index].tabId)
    }
  }

  onActivated = async (activeInfo) => {
    const { tabId, windowId } = activeInfo
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
