import {
  manifest,
  TAB_QUERY,
  ALL,
  EACH,
  CLOSE_PAGES,
  URLS,
  isExtensionURL,
} from '../util'

describe('The Extension page should', () => {
  beforeAll(ALL)
  beforeEach(EACH)

  afterEach(CLOSE_PAGES)

  it('have title ends with the extension name', async () => {
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
        const newPage = await browser.newPage()
        await newPage.goto('https://google.com')
      })
    )
    tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(N + 1)
    const pages = await browser.pages()
    expect(pages).toHaveLength(N + 1)
    await page.bringToFront()
  })

  it('sort the tabs', async () => {
    const wins = await page.$$('.shadow-2xl,.shadow-sm')
    expect(wins).toHaveLength(1)
    let tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(1)
    await Promise.all(
      URLS.map(async (url) => {
        const newPage = await browser.newPage()
        await newPage.goto(url)
      })
    )
    await page.bringToFront()
    tabs = await page.$$eval(TAB_QUERY, (nodes) =>
      nodes.map((node) => node.querySelector('.text-xs').innerText)
    )
    expect(tabs).toHaveLength(URLS.length + 1)
    expect(tabs.filter((tab) => !isExtensionURL(tab))).toEqual([
      'https://www.google.com/',
      'https://github.com/',
      'https://www.google.com/',
    ])
    let pages = await browser.pages()
    let urls = await Promise.all(pages.map(async (page) => await page.url()))
    expect(urls.filter((x) => !isExtensionURL(x))).toEqual([
      'https://www.google.com/',
      'https://github.com/',
      'https://www.google.com/',
    ])
    expect(pages).toHaveLength(URLS.length + 1)
    const sortTabsButton = await page.$('button[title="Sort tabs"]')
    await sortTabsButton.click()
    await page.waitForTimeout(100)

    tabs = await page.$$eval(TAB_QUERY, (nodes) =>
      nodes.map((node) => node.querySelector('.text-xs').innerText)
    )
    expect(tabs).toHaveLength(URLS.length + 1)
    expect(tabs.filter((x) => !isExtensionURL(x))).toEqual([
      'https://github.com/',
      'https://www.google.com/',
      'https://www.google.com/',
    ])
  })

  it('close tab when click close button', async () => {
    await Promise.all(
      URLS.map(async (url) => {
        const newPage = await browser.newPage()
        await newPage.goto(url)
      })
    )
    await page.bringToFront()
    let tabs = await page.$$(TAB_QUERY)

    const pages = await browser.pages()
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
