import { TAB_QUERY, ALL, EACH, URLS } from '../util'

describe('The Tab should', () => {
  beforeAll(ALL)
  beforeEach(EACH)

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
    const tabsCount = tabs.length
    expect(tabsCount).toBe(pages.length)
    const buttons = await tabs[2].$$('button')
    expect(buttons).toHaveLength(3)
    await buttons[2].click()
    tabs = await page.$$(TAB_QUERY)
    expect(tabs.length).toBe(tabsCount - 1)
  })
})
