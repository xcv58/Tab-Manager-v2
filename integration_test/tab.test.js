const { TAB_QUERY, ALL, EACH } = require('./util')

describe('The Tab should', () => {
  beforeAll(ALL)
  beforeEach(EACH)

  it('close tab when click close button', async () => {
    let tabs = await page.$$(TAB_QUERY)
    const pages = await browser.pages()
    const tabsCount = tabs.length
    expect(tabsCount).toBe(pages.length)
    const buttons = await tabs[0].$$('button')
    expect(buttons).toHaveLength(3)
    await buttons[2].click()
    tabs = await page.$$(TAB_QUERY)
    expect(tabs.length).toBe(tabsCount - 1)
  })
})
