import { chromium, Page, ChromiumBrowserContext } from 'playwright'
import manifest from '../../extension/src/manifest.json'
import { TAB_QUERY, URLS } from '../util'
import { join } from 'path'
import expect from 'expect'

const extensionPath = join(__dirname, '../../../build_chrome')

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

const isExtensionURL = (url: string) => url.startsWith('chrome-extension://')

const CLOSE_PAGES = async (browserContext: ChromiumBrowserContext) => {
  const pages = await browserContext.pages()
  for (const page of pages) {
    const url = await page.url()
    if (!isExtensionURL(url)) {
      await page.close()
    }
  }
}

describe('The Extension page should', () => {
  beforeAll(async () => {
    const userDataDir = `/tmp/test-user-data-${Math.random()}`
    browserContext = (await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    })) as ChromiumBrowserContext
    browserContext.on('backgroundpage', (page) => {
      const url = page.url()
      const [, , extensionId] = url.split('/')
      extensionURL = `chrome-extension://${extensionId}/popup.html?not_popup=1`
    })
    page = await browserContext.pages()[0]
  })

  afterAll(async () => {
    await browserContext.close()
    browserContext = null
    page = null
    extensionURL = ''
  })

  beforeEach(async () => {
    await page.waitForTimeout(1000)
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
    await Promise.all(
      [...Array(10)].map(async () => {
        const newPage = await browserContext.newPage()
        await newPage.goto('https://google.com')
      })
    )
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
    await Promise.all(
      URLS.map(async (url) => {
        const newPage = await browserContext.newPage()
        await newPage.goto(url)
      })
    )
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
    await Promise.all(
      URLS.map(async (url) => {
        const newPage = await browserContext.newPage()
        await newPage.goto(url)
      })
    )
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
