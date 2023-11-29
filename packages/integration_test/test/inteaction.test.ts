import { Page, ChromiumBrowserContext } from 'playwright'
import {
  TAB_QUERY,
  URLS,
  isExtensionURL,
  CLOSE_PAGES,
  initBrowserWithExtension,
  openPages,
  matchImageSnapshotOptions,
} from '../util'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

const getCenterOfRect = (rect: {
  top: number
  bottom: number
  left: number
  right: number
}) => {
  const { top, bottom, left, right } = rect
  return [(left + right) / 2, (top + bottom) / 2]
}

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

  it('sort the tabs', async () => {
    const wins = await page.$$('.shadow-2xl,.shadow-sm')
    expect(wins).toHaveLength(1)
    const tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(1)
    await openPages(browserContext, URLS)
    await page.bringToFront()
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    let tabURLs = await page.$$eval(TAB_QUERY, (nodes) =>
      nodes.map((node) => node.querySelector('.text-xs').innerText),
    )
    expect(tabURLs).toHaveLength(URLS.length + 1)
    expect(tabURLs.filter((tab) => !isExtensionURL(tab))).toEqual([
      'https://pinboard.in/',
      'http://xcv58.com/',
      'https://nextjs.org/',
      'https://pinboard.in/',
      'https://duckduckgo.com/',
      'https://ops-class.org/',
    ])
    const pages = await browserContext.pages()
    const urls = await Promise.all(pages.map(async (page) => await page.url()))
    expect(new Set(urls.filter((x) => !isExtensionURL(x)))).toEqual(
      new Set([
        'https://pinboard.in/',
        'http://xcv58.com/',
        'https://nextjs.org/',
        'https://pinboard.in/',
        'https://duckduckgo.com/',
        'https://ops-class.org/',
      ]),
    )
    expect(pages).toHaveLength(URLS.length + 1)
    const sortTabsButton = await page.$('button[aria-label="Sort tabs"]')
    await sortTabsButton.click()
    await page.waitForTimeout(500)

    tabURLs = await page.$$eval(TAB_QUERY, (nodes) =>
      nodes.map((node) => node.querySelector('.text-xs').innerText),
    )
    expect(tabURLs).toHaveLength(URLS.length + 1)
    expect(tabURLs.filter((x) => !isExtensionURL(x))).toEqual([
      'http://xcv58.com/',
      'https://duckduckgo.com/',
      'https://nextjs.org/',
      'https://ops-class.org/',
      'https://pinboard.in/',
      'https://pinboard.in/',
    ])
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)
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

  it('support different theme', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    await page.waitForTimeout(500)
    let toggleThemeButton = await page.$(
      '[aria-label="Toggle light/dark theme"]',
    )
    await toggleThemeButton.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Control+,')
    await page.waitForTimeout(500)
    await page.waitForSelector('[aria-labelledby="update-font-size"]')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    const dialogContent = await page.$('.MuiDialogContent-root')
    expect(await dialogContent.screenshot()).toMatchImageSnapshot(
      matchImageSnapshotOptions,
    )

    await page.keyboard.press('?')
    await page.waitForTimeout(500)
    await page.waitForSelector('table')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    toggleThemeButton = await page.$('[aria-label="Toggle light/dark theme"]')
    await toggleThemeButton.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)
  })

  it('support font size change', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)
    await page.keyboard.press('Control+,')
    await page.waitForTimeout(500)
    await page.waitForSelector('[aria-labelledby="update-font-size"]')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)
    const minFontSize = (
      await page.$$('span[data-index="0"].MuiSlider-mark')
    )[1]
    await minFontSize.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    const largeFontSize = (
      await page.$$('span[data-index="15"].MuiSlider-mark')
    )[1]
    await largeFontSize.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    const defaultFontSize = (
      await page.$$('span[data-index="8"].MuiSlider-mark')
    )[1]
    await defaultFontSize.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  })

  it('support toggle always show toolbar', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.keyboard.press('Control+,')
    await page.waitForTimeout(500)
    await page.waitForSelector('[aria-labelledby="toggle-always-show-toolbar"]')
    await page.waitForTimeout(500)
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    let toogleButton = await page.$(
      '[aria-labelledby="toggle-always-show-toolbar"]',
    )
    await toogleButton.click()

    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    toogleButton = await page.$(
      '[aria-labelledby="toggle-always-show-toolbar"]',
    )
    await toogleButton.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  })

  it('support drag and drop to reorder tabs', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    const tabs = await page.$$(TAB_QUERY)
    const pages = await browserContext.pages()
    expect(tabs.length).toBe(pages.length)
    const lastTab = tabs[tabs.length - 1]
    const rect = await lastTab.evaluate((node) => {
      const { top, bottom, left, right } = node.getBoundingClientRect()
      return { top, bottom, left, right }
    })
    const [x, y] = getCenterOfRect(rect)
    await page.mouse.move(x, y, { steps: 10 })
    const innerHTMLRect = await lastTab.$eval('div.flex > button', (node) => {
      const { top, bottom, left, right } = node.getBoundingClientRect()
      return { top, bottom, left, right }
    })
    const [xx, yy] = getCenterOfRect(innerHTMLRect)
    await page.mouse.move(xx, yy)
    await page.mouse.down()
    // Playwright triggers the drag effect but it wouldn't move the cursor.
    await page.mouse.move(100, 20, { steps: 5 })
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot(matchImageSnapshotOptions)
    const droppableToolSelector = '.z-10.h-12.px-1.text-3xl'
    const dropAreaEl = await page.$(droppableToolSelector)
    expect(await dropAreaEl.screenshot()).toMatchImageSnapshot(
      matchImageSnapshotOptions,
    )
    await page.mouse.up()
  })
})
