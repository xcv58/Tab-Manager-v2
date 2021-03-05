import { Page, ChromiumBrowserContext } from 'playwright'
import manifest from '../../extension/src/manifest.json'
import {
  TAB_QUERY,
  URLS,
  isExtensionURL,
  CLOSE_PAGES,
  initBrowserWithExtension,
  openPages,
} from '../util'
import expect from 'expect'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

describe('The Extension page should', () => {
  beforeAll(async () => {
    const init = await initBrowserWithExtension()
    browserContext = init.browserContext
    extensionURL = init.extensionURL
    page = browserContext.pages()[0]
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
      [...Array(10)].map((_) => 'https://duckduckgo.com')
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
      'https://twitter.com/',
      'http://xcv58.com/',
      'https://nextjs.org/',
      'https://twitter.com/',
      'https://duckduckgo.com/',
    ])
    const pages = await browserContext.pages()
    const urls = await Promise.all(pages.map(async (page) => await page.url()))
    expect(new Set(urls.filter((x) => !isExtensionURL(x)))).toEqual(
      new Set([
        'https://twitter.com/',
        'http://xcv58.com/',
        'https://nextjs.org/',
        'https://twitter.com/',
        'https://duckduckgo.com/',
      ])
    )
    expect(pages).toHaveLength(URLS.length + 1)
    const sortTabsButton = await page.$('button[title="Sort tabs"]')
    await sortTabsButton.click()
    await page.waitForTimeout(100)

    tabURLs = await page.$$eval(TAB_QUERY, (nodes) =>
      nodes.map((node) => node.querySelector('.text-xs').innerText)
    )
    expect(tabURLs).toHaveLength(URLS.length + 1)
    expect(tabURLs.filter((x) => !isExtensionURL(x))).toEqual([
      'http://xcv58.com/',
      'https://duckduckgo.com/',
      'https://nextjs.org/',
      'https://twitter.com/',
      'https://twitter.com/',
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
