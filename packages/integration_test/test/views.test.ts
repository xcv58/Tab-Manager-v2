import { Page, ChromiumBrowserContext } from 'playwright'
import manifest from '../../extension/src/manifest.json'
import {
  TAB_QUERY,
  URLS,
  CLOSE_PAGES,
  initBrowserWithExtension,
  openPages,
  matchImageSnapshotOptions,
} from '../util'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

describe('The Extension page should', () => {
  beforeAll(async () => {
    const init = await initBrowserWithExtension()
    browserContext = init.browserContext
    extensionURL = init.extensionURL
    page = init.page
  })

  afterAll(async () => {
    await browserContext?.close()
    browserContext = null
    page = null
    extensionURL = ''
  })

  beforeEach(async () => {
    if (!extensionURL) {
      console.error('Invalid extensionURL', { extensionURL })
    }
    await page.bringToFront()
    await page.goto(extensionURL)
    await page.waitForTimeout(1000)
    await CLOSE_PAGES(browserContext)
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
      [...Array(N)].map((_) => 'https://ops-class.org/'),
    )
    await page.bringToFront()
    tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(N + 1)
    const pages = await browserContext.pages()
    expect(pages).toHaveLength(N + 1)
    await page.bringToFront()
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)
  })

  it('render popup mode based on URL query', async () => {
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
    const inputSelector = 'input[type="text"]'
    await page.waitForSelector(inputSelector)
    await page.waitForTimeout(500)
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    await page.fill(inputSelector, 'xcv58')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    await page.fill(inputSelector, '')
  })

  it('show correct color for selected tabs', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(500)

    const selectAllButton = await page.$('[aria-label="Select all tabs"]')
    await selectAllButton.click()
    await page.waitForTimeout(500)
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)
  })

  it('support search browser history', async () => {
    const wins = await page.$$('.shadow-2xl,.shadow-sm')
    expect(wins).toHaveLength(1)
    const tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(1)
    await page.goto(extensionURL.replace('not_popup=1', ''))

    await openPages(browserContext, URLS)
    await page.waitForTimeout(500)
    await CLOSE_PAGES(browserContext)
    await page.waitForTimeout(500)
    await openPages(browserContext, URLS)
    await page.waitForTimeout(500)
    await CLOSE_PAGES(browserContext)
    await page.waitForTimeout(500)
    await page.bringToFront()

    const inputSelector = 'input[type="text"]'
    await page.waitForSelector(inputSelector)
    await page.waitForTimeout(500)
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    await page.fill(inputSelector, 'xcv58')
    await page.waitForTimeout(500)
    await page.waitForTimeout(500)
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    await page.fill(inputSelector, 'duck')
    await page.waitForTimeout(500)
    await page.waitForTimeout(500)
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    await page.fill(inputSelector, '')
  })

  it('check duplicated tabs and is case insensitive', async () => {
    await openPages(browserContext, URLS)
    await openPages(browserContext, [
      'http://xcv58.com/ABC',
      'http://xcv58.com/abc',
      'http://xcv58.com/aBC',
    ])
    await page.bringToFront()
    await page.waitForTimeout(500)

    const screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)
  })
})
