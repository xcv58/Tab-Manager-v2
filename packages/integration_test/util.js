export const manifest = require('../extension/src/manifest.json')

export const getExtensionURL = async (browser) => {
  const extensionId = await getExtensionId(browser)
  return `chrome-extension://${extensionId}/popup.html?not_popup=1`
}

export const isExtensionURL = (url) => url.startsWith('chrome-extension://')

const getExtensionId = async (browser) => {
  const targets = await browser.targets()
  const extensionTarget = targets.find(({ _targetInfo }) => {
    return (
      _targetInfo.title === manifest.name &&
      _targetInfo.type === 'background_page'
    )
  })
  const extensionUrl = extensionTarget._targetInfo.url || ''
  const [, , extensionId] = extensionUrl.split('/')
  return extensionId
}

export const TAB_QUERY = 'div[draggable="true"] div[tabindex="-1"]'

export const ALL = async () => {
  const extensionURL = await getExtensionURL(browser)
  await page.goto(extensionURL)
  await page.waitForTimeout(500)
  await CLOSE_PAGES()
}

export const EACH = async () => {
  await page.bringToFront()
}

export const CLOSE_PAGES = async () => {
  const pages = await browser.pages()
  for (const page of pages) {
    const url = await page.url()
    if (!isExtensionURL(url)) {
      await page.close()
    }
  }
}

export const URLS = [
  'https://www.google.com/',
  'https://github.com/',
  'https://www.google.com/',
]
