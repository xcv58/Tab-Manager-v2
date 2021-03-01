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

export const initBrowserContext = async () => {
  const userDataDir = `/tmp/test-user-data-${Math.random()}`
  return (await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  })) as ChromiumBrowserContext
}
