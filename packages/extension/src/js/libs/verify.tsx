import { browser } from 'libs'

export const setBrowserIcon = async () => {
  const iconPathPrefix = 'icon-128'
  const { systemTheme } = await browser.storage.local.get('systemTheme')
  const darkTheme = systemTheme === 'dark'
  ;[browser.browserAction, browser.action].forEach((action) => {
    if (action && action.setIcon) {
      action.setIcon({
        path: `${iconPathPrefix}${darkTheme ? '-dark' : ''}.png`,
      })
    }
  })
}
