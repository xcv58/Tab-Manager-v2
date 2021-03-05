import { chromium, ChromiumBrowserContext, Page } from 'playwright'
import { join } from 'path'

export const EXTENSION_PATH = join(__dirname, '../../build_chrome')

export const TAB_QUERY = 'div[draggable="true"] div[tabindex="-1"]'

export const URLS = [
  'https://www.google.com/',
  'http://xcv58.com/',
  'https://www.gatsbyjs.com/',
  'https://bitcoin.org/',
  'https://www.google.com/',
]

export const isExtensionURL = (url: string) =>
  url.startsWith('chrome-extension://')

export const CLOSE_PAGES = async (browserContext: ChromiumBrowserContext) => {
  const pages = (await browserContext?.pages()) || []
  for (const page of pages) {
    const url = await page.url()
    if (!isExtensionURL(url)) {
      await page.close()
    }
  }
}

export const initBrowserWithExtension = async () => {
  const userDataDir = `/tmp/test-user-data-${Math.random()}`
  let extensionURL: string
  const browserContext = (await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      // Follow suggestions on https://playwright.dev/docs/ci#docker
      '--disable-dev-shm-usage',
      '--ipc=host',
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  })) as ChromiumBrowserContext

  /**
   * The background page is useful to retrieve the extension id so that we
   * could programatically open the extension page.
   *
   * There is uncertain timing of backgroundPages. Sometimes the
   * `browserContext.backgroundPages()` will return empty at the beginning,
   * so we have to rely on the `browserContext.on('backgroundpage')` to get
   * the background page. But sometimes the 'backgroundpage' would never be
   * triggered and the `browserContext.backgroundPages()` would give an array
   * with the existing background page.
   */
  const setExtensionURL = (backgroundPage: Page) => {
    const url = backgroundPage.url()
    const [, , extensionId] = url.split('/')
    extensionURL = `chrome-extension://${extensionId}/popup.html?not_popup=1`
  }

  browserContext.on('backgroundpage', setExtensionURL)
  const backgroundPages = browserContext.backgroundPages()
  if (backgroundPages.length) {
    setExtensionURL(backgroundPages[0])
  }
  const page = await browserContext.newPage()
  await page.bringToFront()
  for (const x in [...Array(10)]) {
    if (extensionURL || x) {
      break
    }
    await page.waitForTimeout(10)
  }
  return { browserContext, extensionURL }
}

export const openPages = async (
  browserContext: ChromiumBrowserContext,
  urls: string[]
) => {
  return await Promise.all(
    urls.map(async (url) => {
      const newPage = await browserContext.newPage()
      await newPage.goto(url)
      await newPage.waitForLoadState('load')
    })
  )
}
