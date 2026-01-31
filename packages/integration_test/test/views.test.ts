import { Page, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  TAB_QUERY,
  URLS,
  CLOSE_PAGES,
  initBrowserWithExtension,
  openPages,
} from '../util'
import manifest from '../../extension/src/manifest.json'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

test.describe('The Extension page should', () => {
  test.describe.configure({ mode: 'serial' })
  test.beforeAll(async () => {
    const init = await initBrowserWithExtension()
    browserContext = init.browserContext
    extensionURL = init.extensionURL
    page = init.page
  })

  test.afterAll(async () => {
    await browserContext?.close()
    browserContext = null
    page = null
    extensionURL = ''
  })

  test.beforeEach(async () => {
    if (!extensionURL) {
      console.error('Invalid extensionURL', { extensionURL })
    }
    await page.bringToFront()
    await page.goto(extensionURL)
    await CLOSE_PAGES(browserContext)
    await page.waitForTimeout(1000)
  })

  test.afterEach(async () => {
    await CLOSE_PAGES(browserContext)
  })

  test('have title ends with the extension name', async () => {
    await page.goto(extensionURL)
    await expect(page.title()).resolves.toMatch(manifest.name)
  })

  test('render correct number of windows & tabs', async () => {
    await page.waitForTimeout(1000)
    await page.reload()
    const wins = await page.$$('.shadow-2xl,.shadow-sm')
    expect(wins).toHaveLength(1)
    await page.reload()
    let tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(1)

    const N = 10

    await openPages(
      browserContext,
      [...Array(N)].map((_) => 'https://ops-class.org/'),
    )
    await page.bringToFront()
    tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(N + 1)
    const pages = await browserContext.pages()
    expect(pages).toHaveLength(N + 1)
    await page.bringToFront()
    await page.reload()
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(
      'render correct number of windows & tabs.png',
      { maxDiffPixelRatio: 0.15 },
    )
  })

  test('render popup mode based on URL query', async () => {
    const wins = await page.$$('.shadow-2xl,.shadow-sm')
    expect(wins).toHaveLength(1)
    const tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(1)
    await page.goto(extensionURL.replace('not_popup=1', ''))

    await openPages(browserContext, URLS)
    await openPages(
      browserContext,
      [...Array(10)].map((_) => 'https://ops-class.org/'),
    )
    await page.bringToFront()
    await page.reload()
    const inputSelector = 'input[type="text"]'
    await page.waitForSelector(inputSelector)
    await page.waitForTimeout(3000)
    // Wait for the UI to be stable and all tabs (URLS count + 10 ops-classes self) to be rendered
    await expect(page.locator(TAB_QUERY)).toHaveCount(URLS.length + 10 + 1)
    await page.waitForTimeout(3000)
    // Wait for the UI to be stable and all tabs (URLS count + 10 ops-classes self) to be rendered
    // Reload to ensure all tabs are detected
    await page.reload()
    await page.waitForTimeout(3000)
    await page.waitForSelector(inputSelector)
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(screenshot, 'popup 1a.png')

    await page.waitForTimeout(1000)
    await page.fill(inputSelector, 'xcv58')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(screenshot, 'popup 2a.png')

    await page.fill(inputSelector, '')
  })

  test('show correct color for selected tabs', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(1000)

    await page.reload()
    const selectAllButton = await page.$('[aria-label="Select all tabs"]')
    await selectAllButton.click()
    await page.waitForTimeout(1000)
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(screenshot, 'correct color.png')
  })

  test('support search browser history', async () => {
    const wins = await page.$$('.shadow-2xl,.shadow-sm')
    expect(wins).toHaveLength(1)
    const tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(1)
    await page.goto(extensionURL.replace('not_popup=1', ''))

    await openPages(browserContext, URLS)
    await page.waitForTimeout(1000)
    await CLOSE_PAGES(browserContext)
    await page.waitForTimeout(1000)
    await openPages(browserContext, URLS)
    await page.waitForTimeout(1000)
    await CLOSE_PAGES(browserContext)
    await page.waitForTimeout(1000)
    await page.bringToFront()

    const inputSelector = 'input[type="text"]'
    await page.waitForSelector(inputSelector)
    await page.waitForTimeout(1000)
    await page.bringToFront()
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(screenshot, 'browser history 1a.png')

    await page.fill(inputSelector, 'xcv58')
    await page.waitForTimeout(1000)
    await page.bringToFront()
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(screenshot, 'browser history 2a.png')

    await page.fill(inputSelector, 'duck')
    await page.waitForTimeout(1000)
    await page.bringToFront()
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(screenshot, 'browser history 3.png')

    await page.fill(inputSelector, '')
  })

  test('check duplicated tabs and is case insensitive', async () => {
    await openPages(browserContext, URLS)
    await openPages(browserContext, [
      'http://xcv58.com/ABC',
      'http://xcv58.com/abc',
      'http://xcv58.com/aBC',
    ])
    await page.bringToFront()
    await page.waitForTimeout(1000)

    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(screenshot, 'duplicated tabs.png')
  })
})
