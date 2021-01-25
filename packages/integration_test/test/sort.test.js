import {
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
})
