// import TabHistory from 'background/TabHistory'
import actions from 'libs/actions'
import {
  createWindow,
  openInNewTab,
  openOrTogglePopup,
  // browser
} from 'libs'
import browser from 'webextension-polyfill'

// browser.omnibox.setDefaultSuggestion({
//   description: 'Open tab manager window',
// })
console.log(browser, browser.storage.local.get)
console.log(browser.runtime.onMessage.addListener)
// chrome.storage.local.get(["badgeText"], ({ badgeText }) => {
//   browser.action.setBadgeText({ text: badgeText });
// });

export const setBrowserIcon = () => {
  const darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)')
  let iconPathPrefix = 'icon-128'
  if (darkThemeMq.matches) {
    iconPathPrefix += '-dark'
  }
  browser.browserAction.setIcon({
    path: `${iconPathPrefix}.png`,
  })
}

export class Background {
  tabHistory: TabHistory
  actionMap: {
    [key: string]: () => void
  }

  constructor() {
    browser.omnibox.setDefaultSuggestion({
      description: 'Open tab manager window',
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
      [actions.createWindow]: this.createWindow,
    }
    Object.assign(this.actionMap, this.tabHistory.actionMap)
    // this.browserAction()
    setBrowserIcon()
  }
}

const _createWindow = (request, sender, sendResponse) => {
  createWindow(request.tabs)
  sendResponse()
}

const actionMap = {
  [actions.togglePopup]: openOrTogglePopup,
  [actions.openInNewTab]: openInNewTab,
  [actions.createWindow]: _createWindow,
}

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

// // // const tabHistory = new TabHistory(this)
browser.runtime.onMessage.addListener(onMessage)
browser.commands.onCommand.addListener(onCommand)

// Object.assign(this.actionMap, this.tabHistory.actionMap)

// export class Background {
//   tabHistory: TabHistory
//   actionMap: {
//     [key: string]: () => void
//   }

//   constructor() {
//     // this.browserAction()
//   }

//   // NOT in use
//   // browserAction = () => {
//   //   browser.browserAction.onClicked.addListener(openOrTogglePopup)
//   // }

// }

// ; (() => new Background())()
