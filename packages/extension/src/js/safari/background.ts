import { toggleStandaloneWindow } from './standaloneWindow'
import { browser, popupURL } from 'libs'
import TabHistory from 'background/TabHistory'
import TabCountIcon from 'background/TabCountIcon'
import { setBrowserIcon } from 'libs/verify'

const history = new TabHistory()
new TabCountIcon()
void setBrowserIcon().catch(() => {})
const runCommand = async (command: string) => {
  if (command === 'OPEN-IN-NEW-TAB')
    return browser.tabs.create({ url: popupURL })
  if (command === 'TOGGLE-POPUP') {
    // Capture the foreground tab before Safari hands focus to the manager.
    await history.rememberFocusedTab()
    return toggleStandaloneWindow()
  }
  if (command === 'LAST-ACTIVE-TAB') return history.activateTab()
  return undefined
}
const reportError = (error: unknown) =>
  browser.storage.local.set({
    safariLaunchError:
      error instanceof Error
        ? error.message
        : 'Safari could not open Tab Manager. Please try again.',
  })
browser.runtime.onMessage.addListener((request: any, sender: any) => {
  if (request?.kind) return undefined
  if (
    sender.id !== browser.runtime.id ||
    (sender.url && !sender.url.startsWith(browser.runtime.getURL('')))
  )
    return undefined
  if (
    !['OPEN-IN-NEW-TAB', 'TOGGLE-POPUP', 'LAST-ACTIVE-TAB'].includes(
      request?.action,
    )
  )
    return undefined
  return Promise.resolve()
    .then(() => runCommand(request.action))
    .then(() => ({ ok: true }))
})
browser.commands?.onCommand?.addListener((command: string) => {
  void Promise.resolve()
    .then(() => runCommand(command))
    .catch(reportError)
})
browser.runtime.onInstalled.addListener((details: any) => {
  if (details.reason === 'install')
    void browser.tabs.create({ url: popupURL }).catch(reportError)
})
