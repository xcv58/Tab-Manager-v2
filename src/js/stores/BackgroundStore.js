import { action, observable } from 'mobx'
import { activateTab } from '../libs'

export default class BackgroundStore {
  @observable tabHistory = []
  @observable count = 0
  resetCountHandler = null

  resetCount = () => {
    if (this.resetCountHandler != null) {
      clearTimeout(this.resetCountHandler)
    }
    this.resetCountHandler = setTimeout(
      () => {
        this.count = 0
      },
      1000
    )
  }

  add = ({ tabId, windowId, title }) => {
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
      activateTab(this.tabHistory[Math.max(index, 0)].tabId)
    }
  }

  @action
  onActivated = async (activeInfo) => {
    const { tabId, windowId } = activeInfo
    const tab = await chrome.tabs.get(tabId)
    this.add({ tabId, windowId, title: tab.title })
  }

  @action
  onFocusChanged = async (windowId) => {
    const tab = await chrome.tabs.query({ active: true, windowId })
    if (tab.length === 0) {
      return
    }
    this.add({ tabId: tab.id, windowId, title: tab[0].title })
  }

  @action
  onRemoved = async (tabId) => {
    this.remove(tabId)
  }

  @action
  onMessage = (request, sender, sendResponse) => {
    if (request.action === 'last-active-tab') {
      this.activateTab()
    }
    sendResponse()
  }
}
