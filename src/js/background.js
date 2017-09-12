import '../img/icon-16.png'
import '../img/icon-48.png'
import '../img/icon-128.png'
import 'chrome-extension-async'
import TabHistory from './background/TabHistory'
import actions from './libs/actions'
import { createWindow } from './libs'

class Background {
  constructor () {
    this.tabHistory = new TabHistory(this)
    chrome.runtime.onMessage.addListener(this.onMessage)
    this.actionMap = {
      [actions.createWindow()]: this.createWindow
    }
    Object.assign(this.actionMap, this.tabHistory.actionMap)
  }

  createWindow = async (request, sender, sendResponse) => {
    createWindow(request.tabs)
    sendResponse()
  }

  onMessage = (request, sender, sendResponse) => {
    const { action } = request
    const func = this.actionMap[action]
    if (func && typeof func === 'function') {
      func(request, sender, sendResponse)
    } else {
      sendResponse(`Unknown action: ${action}`)
    }
  }
}

(() => new Background())()
