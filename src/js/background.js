import '../img/icon-16.png'
import '../img/icon-48.png'
import '../img/icon-128.png'
import 'chrome-extension-async'
import TabHistory from './background/TabHistory'

class Background {
  constructor () {
    this.tabHistory = new TabHistory(this)
    chrome.runtime.onMessage.addListener(this.onMessage)
  }

  onMessage = (request, sender, sendResponse) => {
    if (request.action === 'last-active-tab') {
      this.tabHistory.activateTab()
    }
    if (!sendResponse && typeof sendResponse === 'function') {
      sendResponse()
    }
  }
}

(() => new Background())()
