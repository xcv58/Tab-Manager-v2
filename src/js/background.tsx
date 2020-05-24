import TabHistory from 'background/TabHistory'
import actions from 'libs/actions'
import { createWindow, openInNewTab, openOrTogglePopup, browser } from 'libs'

export class Background {
  tabHistory: TabHistory
  actionMap: {
    [key: string]: Function
  }

  constructor () {
    browser.omnibox.setDefaultSuggestion({
      description: 'Open tab manager window'
    })
    browser.omnibox.onInputEntered.addListener(() => {
      openOrTogglePopup()
    })
    this.tabHistory = new TabHistory(this)
    browser.runtime.onMessage.addListener(this.onMessage)
    browser.commands.onCommand.addListener(this.onCommand)
    this.actionMap = {
      [actions.togglePopup]: openOrTogglePopup,
      [actions.openInNewTab]: openInNewTab,
      [actions.createWindow]: this.createWindow
    }
    Object.assign(this.actionMap, this.tabHistory.actionMap)
    // this.browserAction()
  }

  browserAction = () => {
    browser.browserAction.onClicked.addListener(openOrTogglePopup)
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

;(() => new Background())()
