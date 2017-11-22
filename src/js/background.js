import 'chrome-extension-async'
import TabHistory from 'background/TabHistory'
import actions from 'libs/actions'
import { createWindow, openInNewTab, openOrTogglePopup } from 'libs'

class Background {
  constructor () {
    this.tabHistory = new TabHistory(this)
    chrome.runtime.onMessage.addListener(this.onMessage)
    chrome.commands.onCommand.addListener(this.onCommand)
    this.actionMap = {
      [actions.togglePopup]: openOrTogglePopup,
      [actions.openInNewTab]: openInNewTab,
      [actions.createWindow]: this.createWindow
    }
    Object.assign(this.actionMap, this.tabHistory.actionMap)
    this.browserAction()
  }

  browserAction = () => {
    chrome.browserAction.onClicked.addListener(openOrTogglePopup)
  }

  createWindow = async (request, sender, sendResponse) => {
    createWindow(request.tabs)
    sendResponse()
  }

  onCommand = (action) => {
    const func = this.actionMap[action]
    if (func && typeof func === 'function') {
      func()
    }
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
