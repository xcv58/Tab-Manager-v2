import { action, observable } from 'mobx'

export default class BackgroundStore {
  @observable tabHistory = []

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
}
