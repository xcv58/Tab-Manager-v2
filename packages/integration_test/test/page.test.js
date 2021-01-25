import { manifest, TAB_QUERY, ALL, EACH, CLOSE_PAGES } from '../util'

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
})
