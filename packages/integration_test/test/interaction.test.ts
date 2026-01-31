import { Page, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
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

test.describe('The Extension page should', () => {
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

  test('sort the tabs', async () => {
    await page.waitForTimeout(1000)
    await page.reload()
    const wins = await page.$$('.shadow-2xl,.shadow-sm')
    expect(wins).toHaveLength(1)
    const tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(1)
    await openPages(browserContext, URLS)
    await page.bringToFront()
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(test.info(), 'sort the tabs 1.png')

    let tabURLs = await page.$$eval(TAB_QUERY, (nodes) =>
      nodes.map((node) => node.querySelector('.text-xs').innerText),
    )
    expect(tabURLs).toHaveLength(URLS.length + 1)
    expect(tabURLs.filter((tab) => !isExtensionURL(tab))).toEqual([
      'https://pinboard.in/',
      'https://xcv58.com/',
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
        'https://xcv58.com/',
        'https://nextjs.org/',
        'https://pinboard.in/',
        'https://duckduckgo.com/',
        'https://ops-class.org/',
      ]),
    )
    expect(pages).toHaveLength(URLS.length + 1)
    const sortTabsButton = await page.$('button[aria-label="Sort tabs"]')
    await sortTabsButton.click()
    await page.waitForTimeout(1000)

    tabURLs = await page.$$eval(TAB_QUERY, (nodes) =>
      nodes.map((node) => node.querySelector('.text-xs').innerText),
    )
    expect(tabURLs).toHaveLength(URLS.length + 1)
    expect(tabURLs.filter((x) => !isExtensionURL(x))).toEqual([
      'https://duckduckgo.com/',
      'https://nextjs.org/',
      'https://ops-class.org/',
      'https://pinboard.in/',
      'https://pinboard.in/',
      'https://xcv58.com/',
    ])
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(test.info(), 'sort the tabs 2.png')
  })

  test('search input field should clear after selecting a command', async () => {
    // Set up initial page state
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(1000)

    // Verify initial state
    const searchInput = await page.$(
      'input[placeholder*="Search your tab title or URL"]',
    )
    expect(searchInput).toBeTruthy()

    // Type a command in the search box
    await searchInput.click()
    await searchInput.fill('>clean dup')
    await page.waitForTimeout(1000)

    // Wait for and select the first command option that appears
    const commandOption = await page.waitForSelector('.MuiAutocomplete-option')
    await commandOption.click()
    await page.waitForTimeout(1000)

    // Verify that the input field is cleared after command selection
    const inputValue = await searchInput.inputValue()
    expect(inputValue).toBe('')
  })

  test('close tab when click close button', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.reload()
    await page.waitForTimeout(500)
    let tabs = await page.$$(TAB_QUERY)

    const pages = await browserContext.pages()
    expect(tabs.length).toBe(pages.length)
    let buttons = await tabs[tabs.length - 1].$$('button')
    expect(buttons).toHaveLength(3)
    await buttons[2].click()
    await page.waitForTimeout(500)

    tabs = await page.$$(TAB_QUERY)
    expect(tabs.length).toBe(pages.length - 1)

    buttons = await tabs[tabs.length - 1].$$('button')
    expect(buttons).toHaveLength(3)
    await buttons[2].click()
    await page.waitForTimeout(500)

    tabs = await page.$$(TAB_QUERY)
    expect(tabs.length).toBe(pages.length - 2)

    buttons = await tabs[tabs.length - 1].$$('button')
    expect(buttons).toHaveLength(3)
    await buttons[2].click()
    await page.waitForTimeout(500)

    tabs = await page.$$(TAB_QUERY)
    expect(tabs.length).toBe(pages.length - 3)
  })

  test('support different theme', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.waitForTimeout(500)
    let toggleThemeButton = await page.$(
      '[aria-label="Toggle light/dark theme"]',
    )
    await toggleThemeButton.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Control+,')
    await page.waitForTimeout(500)
    await page.waitForSelector('[aria-labelledby="update-font-size"]')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    const dialogContent = await page.$('.MuiDialogContent-root')
    expect(await dialogContent.screenshot()).toMatchSnapshot(
      matchImageSnapshotOptions,
    )

    await page.keyboard.press('?')
    await page.waitForTimeout(500)
    await page.waitForSelector('table')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    toggleThemeButton = await page.$('[aria-label="Toggle light/dark theme"]')
    await toggleThemeButton.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)
  })

  test('support font size change', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)
    await page.keyboard.press('Control+,')
    await page.waitForTimeout(500)
    await page.waitForSelector('[aria-labelledby="update-font-size"]')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)
    const minFontSize = (
      await page.$$('span[data-index="0"].MuiSlider-mark')
    )[1]
    await minFontSize.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    const largeFontSize = (
      await page.$$('span[data-index="15"].MuiSlider-mark')
    )[1]
    await largeFontSize.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    const defaultFontSize = (
      await page.$$('span[data-index="8"].MuiSlider-mark')
    )[1]
    await defaultFontSize.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  })

  test('support toggle always show toolbar', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.keyboard.press('Control+,')
    await page.waitForTimeout(500)
    await page.waitForSelector('[aria-labelledby="toggle-always-show-toolbar"]')
    await page.waitForTimeout(500)
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    let toogleButton = await page.$(
      '[aria-labelledby="toggle-always-show-toolbar"]',
    )
    await toogleButton.click()

    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    toogleButton = await page.$(
      '[aria-labelledby="toggle-always-show-toolbar"]',
    )
    await toogleButton.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  })

  test('support drag and drop to reorder tabs', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.reload()
    await page.waitForTimeout(500)
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
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)
    const droppableToolSelector = '.z-10.h-12.px-1.text-3xl'
    const dropAreaEl = await page.$(droppableToolSelector)
    expect(await dropAreaEl.screenshot()).toMatchSnapshot(
      matchImageSnapshotOptions,
    )
    await page.mouse.up()
  })
})
