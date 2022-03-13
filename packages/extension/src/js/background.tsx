import TabHistory from 'background/TabHistory'
import actions from 'libs/actions'
import { createWindow, openInNewTab, openOrTogglePopup, browser } from 'libs'

// Edge browser has this issue: https://github.com/GoogleChrome/chrome-extensions-samples/issues/541
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

export const setBrowserIcon = async () => {
  const iconPathPrefix = 'icon-128'
  let darkTheme = false
  if (typeof window === 'undefined') {
    const { systemTheme } = await browser.storage.local.get('systemTheme')
    darkTheme = systemTheme === 'dark'
  } else {
    const darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)')
    darkTheme = Boolean(darkThemeMq.matches)
  }
  ;[browser.browserAction, browser.action].forEach((action) => {
    if (action && action.setIcon) {
      action.setIcon({
        path: `${iconPathPrefix}${darkTheme ? '-dark' : ''}.png`,
      })
    }
  })
}

browser.storage.onChanged.addListener((changes: any, areaName: string) => {
  if (areaName === 'local' && changes.systemTheme) {
    setBrowserIcon()
  }
})

setBrowserIcon()

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

const onCommand = (action) => {
  const func = actionMap[action]
  if (func && typeof func === 'function') {
    func()
  }
}

browser.runtime.onMessage.addListener(onMessage)
browser.commands.onCommand.addListener(onCommand)
