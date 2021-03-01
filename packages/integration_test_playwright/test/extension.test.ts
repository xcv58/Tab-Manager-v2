import { Page, ChromiumBrowserContext } from 'playwright'
import manifest from '../../extension/src/manifest.json'
import {
  TAB_QUERY,
  URLS,
  isExtensionURL,
  CLOSE_PAGES,
  initBrowserContext,
  openPages,
} from '../util'
import expect from 'expect'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

const setExtensionURL = (backgroundPage: Page) => {
  const url = backgroundPage.url()
  const [, , extensionId] = url.split('/')
  extensionURL = `chrome-extension://${extensionId}/popup.html?not_popup=1`
  console.log('browserContext.on backgroundpage', { extensionURL })
}

describe('The Extension page should', () => {
  beforeAll(async () => {
    browserContext = (await initBrowserContext()) as ChromiumBrowserContext
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
    browserContext.on('backgroundpage', setExtensionURL)
    const backgroundPages = browserContext.backgroundPages()
    if (backgroundPages.length) {
      setExtensionURL(backgroundPages[0])
    }
    await openPages(browserContext, URLS)
    page = await browserContext.pages()[0]
    await page.bringToFront()
    for (const x in [...Array(100)]) {
      if (extensionURL || x) {
        break
      }
      await page.waitForTimeout(100)
    }
  })

  afterAll(async () => {
    await browserContext?.close()
    browserContext = null
    page = null
    extensionURL = ''
  })

  beforeEach(async () => {
    console.log({ extensionURL })
    await page.waitForTimeout(1000)
    await page.bringToFront()
  })

  afterEach(async () => {
    await CLOSE_PAGES(browserContext)
  })

  it('have title ends with the extension name', async () => {
    await page.goto(extensionURL)
    await expect(page.title()).resolves.toMatch(manifest.name)
  })

  it('render correct number of windows & tabs', async () => {
    const wins = await page.$$('.shadow-2xl,.shadow-sm')
    expect(wins).toHaveLength(1)
    let tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(1)

    const N = 10

    await openPages(
      browserContext,
      [...Array(10)].map((_) => 'https://google.com')
    )
    await page.bringToFront()
    tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(N + 1)
    const pages = await browserContext.pages()
    expect(pages).toHaveLength(N + 1)
    await page.bringToFront()
  })

  it('sort the tabs', async () => {
    const wins = await page.$$('.shadow-2xl,.shadow-sm')
    expect(wins).toHaveLength(1)
    const tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(1)
    await openPages(browserContext, URLS)
    await page.bringToFront()

    let tabURLs = await page.$$eval(TAB_QUERY, (nodes) =>
      nodes.map((node) => node.querySelector('.text-xs').innerText)
    )
    expect(tabURLs).toHaveLength(URLS.length + 1)
    expect(tabURLs.filter((tab) => !isExtensionURL(tab))).toEqual([
      'https://www.google.com/',
      'https://github.com/',
      'https://www.google.com/',
    ])
    const pages = await browserContext.pages()
    const urls = await Promise.all(pages.map(async (page) => await page.url()))
    expect(urls.filter((x) => !isExtensionURL(x))).toEqual([
      'https://www.google.com/',
      'https://github.com/',
      'https://www.google.com/',
    ])
    expect(pages).toHaveLength(URLS.length + 1)
    const sortTabsButton = await page.$('button[title="Sort tabs"]')
    await sortTabsButton.click()
    await page.waitForTimeout(100)

    tabURLs = await page.$$eval(TAB_QUERY, (nodes) =>
      nodes.map((node) => node.querySelector('.text-xs').innerText)
    )
    expect(tabURLs).toHaveLength(URLS.length + 1)
    expect(tabURLs.filter((x) => !isExtensionURL(x))).toEqual([
      'https://github.com/',
      'https://www.google.com/',
      'https://www.google.com/',
    ])
  })

  it('close tab when click close button', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    let tabs = await page.$$(TAB_QUERY)

    const pages = await browserContext.pages()
    expect(tabs.length).toBe(pages.length)
    let buttons = await tabs[tabs.length - 1].$$('button')
    expect(buttons).toHaveLength(3)
    await buttons[2].click()
    await page.waitForTimeout(100)

    tabs = await page.$$(TAB_QUERY)
    expect(tabs.length).toBe(pages.length - 1)

    buttons = await tabs[tabs.length - 1].$$('button')
    expect(buttons).toHaveLength(3)
    await buttons[2].click()
    await page.waitForTimeout(100)

    tabs = await page.$$(TAB_QUERY)
    expect(tabs.length).toBe(pages.length - 2)

    buttons = await tabs[tabs.length - 1].$$('button')
    expect(buttons).toHaveLength(3)
    await buttons[2].click()
    await page.waitForTimeout(100)

    tabs = await page.$$(TAB_QUERY)
    expect(tabs.length).toBe(pages.length - 3)
  })
})
