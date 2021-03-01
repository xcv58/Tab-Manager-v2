import { chromium, ChromiumBrowserContext } from 'playwright'
import { join } from 'path'

export const EXTENSION_PATH = join(__dirname, '../../build_chrome')

export const TAB_QUERY = 'div[draggable="true"] div[tabindex="-1"]'

export const URLS = [
  'https://www.google.com/',
  'https://github.com/',
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

export const initBrowserContext = () => {
  const userDataDir = `/tmp/test-user-data-${Math.random()}`
  return chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      // Follow suggestions on https://playwright.dev/docs/ci#docker
      '--disable-dev-shm-usage',
      '--ipc=host',
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  })
}

export const openPages = async (
  browserContext: ChromiumBrowserContext,
  urls: string[]
) => {
  return await Promise.all(
    urls.map(async (url) => {
      const newPage = await browserContext.newPage()
      await newPage.goto(url)
    })
  )
}
