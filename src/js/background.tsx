import TabHistory from 'background/TabHistory'
import actions from 'libs/actions'
import { createWindow, openInNewTab, openOrTogglePopup, browser } from 'libs'

export class Background {
  tabHistory: TabHistory
  actionMap: {
    [key: string]: Function
  }

  constructor () {
    this.tabHistory = new TabHistory(this)
    browser.runtime.onMessage.addListener(this.onMessage)
    browser.commands.onCommand.addListener(this.onCommand)
    this.actionMap = {
      [actions.togglePopup]: openOrTogglePopup,
      [actions.openInNewTab]: openInNewTab,
      [actions.createWindow]: this.createWindow
    }
    Object.assign(this.actionMap, this.tabHistory.actionMap)
    this.browserAction()
  }

  browserAction = () => {
    console.log('browser action:')
    // browser.browserAction.onClicked.addListener(openOrTogglePopup)
    browser.browserAction.onClicked.addListener(async () => {
      const result = await browser.storage.sync.get({ openStandalone: false })
      if (result.openStandalone) {
        return openOrTogglePopup()
      }
      try {
        browser.browserAction.openPopup()
        // openOrTogglePopup()
      } catch (e) {
        console.error(e)
        openOrTogglePopup()
      }
    })
  }

  createWindow = async (request, sender, sendResponse) => {
    createWindow(request.tabs)
    sendResponse()
  }

  onCommand = action => {
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
