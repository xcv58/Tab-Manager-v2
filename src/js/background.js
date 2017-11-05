import 'chrome-extension-async'
import TabHistory from 'background/TabHistory'
import actions from 'libs/actions'
import { createWindow } from 'libs'

class Background {
  constructor () {
    this.tabHistory = new TabHistory(this)
    chrome.runtime.onMessage.addListener(this.onMessage)
    chrome.commands.onCommand.addListener(this.onCommand)
    this.actionMap = {
      [actions.createWindow]: this.createWindow
    }
    Object.assign(this.actionMap, this.tabHistory.actionMap)
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
