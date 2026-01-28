import TabHistory from 'background/TabHistory'
import actions from 'libs/actions'
import { createWindow, openInNewTab, openOrTogglePopup, browser } from 'libs'

import { setBrowserIcon } from 'libs/verify'

const init = async () => {
  // Edge browser has this issue: https://github.com/GoogleChrome/chrome-extensions-samples/issues/541
  if (browser.omnibox) {
    try {
      browser.omnibox.setDefaultSuggestion({
        description: 'Open tab manager window',
      })
    } catch (e) {
      console.log(e)
    }

    browser.omnibox.onInputEntered.addListener(() => {
      openOrTogglePopup()
    })
  }

  browser.storage.onChanged.addListener((changes: any, areaName: string) => {
    if (areaName === 'local' && changes.systemTheme) {
      setBrowserIcon()
    }
  })

  setBrowserIcon()
}

init()

const tabHistory = new TabHistory()
const _createWindow = (request, sender, sendResponse) => {
  createWindow(request.tabs)
  sendResponse()
}

const actionMap = {
  [actions.togglePopup]: openOrTogglePopup,
  [actions.openInNewTab]: openInNewTab,
  [actions.createWindow]: _createWindow,
}

Object.assign(actionMap, tabHistory.actionMap)

const onMessage = (request, sender, sendResponse) => {
  const { action } = request
  const func = actionMap[action]
  if (func && typeof func === 'function') {
    func(request, sender, sendResponse)
  } else {
    sendResponse(`Unknown action: ${action}`)
  }
}

const onCommand = (action: string) => {
  const func = actionMap[action]
  if (func && typeof func === 'function') {
    func()
  }
}

browser.runtime.onMessage.addListener(onMessage)
browser.commands.onCommand.addListener(onCommand)

const onInstalled = (details: any) => {
  if (details.reason === 'install') {
    openInNewTab()
  }
}

browser.runtime.onInstalled.addListener(onInstalled)
