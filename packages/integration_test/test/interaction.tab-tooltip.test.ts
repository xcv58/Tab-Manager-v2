import { test, expect } from '@playwright/test'
import {
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
} from '../util'

test('select, expand and copy long tab details without activating the tab', async () => {
  test.setTimeout(120000)
  const { browserContext, page, extensionURL } =
    await initBrowserWithExtension()
  const sourceTitle =
    'Research notes 研究 🔎 — design, keyboard and accessibility. '
      .repeat(100)
      .trim()
  const url = `https://example.com/long-tab?notes=${'reference-'.repeat(1200)}`
  try {
    await closeCurrentWindowTabsExceptActive(page, extensionURL)
    await page.evaluate(async () => {
      await chrome.storage.sync.set({
        useSystemTheme: false,
        darkTheme: false,
        showTabTooltip: true,
        tabTooltipUrlLines: 3,
        showSearchResultMenu: false,
      })
    })
    await browserContext.route(
      'https://example.com/long-tab?notes=*',
      (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><title>Fixture</title>',
        }),
    )
    const fixturePage = await browserContext.newPage()
    await fixturePage.goto(url)
    await fixturePage.evaluate((value) => {
      document.title = value
    }, sourceTitle)
    const readFixtureTab = () =>
      page.evaluate(async (expectedUrl) => {
        const tabs = await chrome.tabs.query({})
        return tabs.find(
          (tab) =>
            tab.url === expectedUrl && tab.title?.startsWith('Research notes'),
        )
      }, url)
    await expect.poll(readFixtureTab).toBeDefined()
    const fixtureTab = await readFixtureTab()
    const tabId = fixtureTab.id
    const title = fixtureTab.title
    expect(title.length).toBeGreaterThan(1000)
    expect(title).toContain('研究 🔎')
    await page.bringToFront()
    await page.reload()
    const row = page.getByTestId(`tab-row-${tabId}`)
    await expect(row).toBeVisible()
    const card = page.getByRole('dialog', { name: 'Tab details', exact: true })
    const titleText = page.getByTestId('tab-tooltip-title')
    const urlText = page.getByTestId('tab-tooltip-url')
    const hoverDetails = async () => {
      await row.locator('button[aria-haspopup="dialog"]').hover()
      await expect(card).toBeVisible()
    }
    await hoverDetails()
    const anchor = await row
      .locator('button[aria-haspopup="dialog"]')
      .boundingBox()
    const bounds = await card.boundingBox()
    // Cross the actual bridge slowly, over where the following row would be.
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      anchor.y + anchor.height + 4,
    )
    await page.waitForTimeout(350)
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 20)
    await page.waitForTimeout(350)
    await expect(card).toBeVisible()
    await expect(
      card.getByRole('button', { name: 'Show full title' }),
    ).toBeVisible()
    await expect(
      card.getByRole('button', { name: 'Show full URL' }),
    ).toBeVisible()
    await expect(titleText).toHaveText(title, { useInnerText: false })
    await expect(urlText).toHaveText(url, { useInnerText: false })
    await expect(card).toHaveScreenshot('tab-details-collapsed.png')

    // Real pointer selection, rather than a synthetic DOM selection.
    const textBounds = await titleText.boundingBox()
    await page.mouse.move(textBounds.x + 2, textBounds.y + 10)
    await page.mouse.down()
    await page.mouse.move(textBounds.x + 180, textBounds.y + 10, { steps: 12 })
    await page.mouse.up()
    expect(
      await page.evaluate(() => window.getSelection()?.toString().length),
    ).toBeGreaterThan(5)
    await expect(card).toBeVisible()

    await browserContext.grantPermissions(['clipboard-read', 'clipboard-write'])
    await card.getByRole('button', { name: 'Copy title' }).click()
    await expect(card.getByRole('status')).toHaveText('Title copied')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      title,
    )
    await card.getByRole('button', { name: 'Copy URL' }).click()
    await expect(card.getByRole('status')).toHaveText('URL copied')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url)
    await card.getByRole('button', { name: 'Show full title' }).click()
    await expect(titleText).not.toHaveClass(/line-clamp/)
    await expect(urlText).toHaveClass(/line-clamp-3/)
    await card.getByRole('button', { name: 'Show less title' }).click()
    await card.getByRole('button', { name: 'Show full URL' }).click()
    const scroll = card.locator('.tab-details-scroller')
    const metrics = await scroll.evaluate((node) => ({
      height: node.clientHeight,
      scroll: node.scrollHeight,
    }))
    expect(metrics.scroll).toBeGreaterThan(metrics.height)
    expect(metrics.height).toBeLessThan(620)
    await scroll.evaluate((node) => {
      node.scrollTop = 0
    })
    await page.waitForTimeout(1700)
    await expect(card).toHaveScreenshot('tab-details-expanded.png')
    await page.mouse.move(1278, 2)
    await page.waitForTimeout(400)
    await expect(card).toBeVisible() // Keyboard focus inside the card keeps it open.
    await page.keyboard.press('Escape')
    await expect(card).toBeHidden()
    await expect(row.locator('button[aria-haspopup="dialog"]')).toBeFocused()

    const search = page.getByRole('combobox')
    await search.fill('Research notes')
    await page.waitForTimeout(600)
    await row.focus()
    await page.keyboard.press('Alt+ArrowDown')
    await expect(card.getByRole('button', { name: 'Copy title' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(card).toBeHidden()
    await expect(search).toHaveValue('Research notes')
    await row.focus()
    await hoverDetails()
    await card.hover()
    await page.keyboard.press('Control+,')
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
    await expect(settings).toBeVisible()
    await expect(card).toBeHidden({ timeout: 2000 })
    await page.keyboard.press('Escape')
    await expect(settings).toBeHidden()
    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const [active] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          })
          return active?.url
        }),
      )
      .toBe(extensionURL)

    await page.evaluate(async () => {
      await chrome.storage.sync.set({ darkTheme: true })
    })
    await page.reload()
    await expect(row).toBeVisible()
    await hoverDetails()
    await card.hover()
    await expect(card).toHaveScreenshot('tab-details-dark.png')
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 390, height: 720 })
    await hoverDetails()
    await card.hover()
    const narrow = await card.boundingBox()
    expect(narrow.x).toBeGreaterThanOrEqual(8)
    expect(narrow.x + narrow.width).toBeLessThanOrEqual(382)
    expect(
      await card.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true)
    await expect(card).toHaveScreenshot('tab-details-narrow.png')
    await page.mouse.click(388, 2)
    await expect(card).toBeHidden()

    // Existing full-URL preference persists and only the title needs expansion.
    await page.evaluate(async () => {
      await chrome.storage.sync.set({ tabTooltipUrlLines: 'full' })
    })
    await page.reload()
    await expect(row).toBeVisible()
    await hoverDetails()
    await expect(
      card.getByRole('button', { name: 'Show full URL' }),
    ).toHaveCount(0)
    await expect(urlText).not.toHaveClass(/line-clamp/)
  } finally {
    await browserContext.close()
  }
})
