import { test, expect } from '@playwright/test'
import {
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
} from '../util'

test('isolate tooltip shortcuts while retaining native copy and normal dismissal', async () => {
  const { browserContext, page, extensionURL } = await initBrowserWithExtension(
    { headless: true },
  )
  try {
    await closeCurrentWindowTabsExceptActive(page, extensionURL)
    await page.evaluate(async () => {
      await chrome.storage.sync.set({
        showTabTooltip: true,
        showSearchResultMenu: false,
      })
    })
    const fixture = await browserContext.newPage()
    await fixture.goto(
      'data:text/html,<title>Shortcut isolation title</title>fixture',
    )
    await page.bringToFront()
    const tabId = await page.evaluate(
      async () =>
        (await chrome.tabs.query({})).find(
          (tab) => tab.title === 'Shortcut isolation title',
        ).id,
    )
    await page.reload()
    const row = page.getByTestId('tab-row-' + tabId)
    const anchor = row.locator('button[aria-haspopup="dialog"]')
    const panel = page.getByRole('dialog', { name: 'Tab details', exact: true })
    await anchor.hover()
    await expect(panel).toBeVisible()
    await page.mouse.move(1278, 2)
    await expect(panel).toBeHidden()
    await anchor.focus()
    await anchor.press('Alt+ArrowDown')
    await expect(
      panel.getByRole('button', { name: 'Copy title' }),
    ).toBeFocused()
    const readTabs = () =>
      page.evaluate(async () =>
        (await chrome.tabs.query({})).map(({ id, pinned, url }) => ({
          id,
          pinned,
          url,
        })),
      )
    const before = await readTabs()
    let reloads = 0
    fixture.on('framenavigated', () => {
      reloads++
    })
    for (const key of ['p', 'r', 'x', 'd', 'd']) await page.keyboard.press(key)
    await page.waitForTimeout(300)
    expect(await readTabs()).toEqual(before)
    expect(reloads).toBe(0)
    await expect(
      row.getByRole('checkbox', { name: 'Toggle select' }),
    ).not.toBeChecked()
    await expect(panel).toBeVisible()
    await browserContext.grantPermissions(['clipboard-read', 'clipboard-write'])
    await panel.getByTestId('tab-tooltip-title').click()
    await page.evaluate(() => {
      const text = document.querySelector('[data-testid="tab-tooltip-title"]')
      const range = document.createRange()
      range.selectNodeContents(text)
      window.getSelection().removeAllRanges()
      window.getSelection().addRange(range)
    })
    await page.keyboard.press('Control+c')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'Shortcut isolation title',
    )
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
  } finally {
    await browserContext.close()
  }
})

test('select, expand and copy long tab details without activating the tab', async () => {
  test.setTimeout(120000)
  const { browserContext, page, extensionURL } = await initBrowserWithExtension(
    { headless: true },
  )
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
    await expect(urlText).not.toHaveClass(/line-clamp/)
    const scroll = card.locator('.tab-details-scroller')
    // Each expanded field scrolls independently, keeping the other field and
    // its copy/expand controls available even for extremely long text.
    const metrics = await urlText.evaluate((node) => ({
      height: node.clientHeight,
      scroll: node.scrollHeight,
    }))
    expect(metrics.scroll).toBeGreaterThan(metrics.height)
    expect(metrics.height).toBeLessThanOrEqual(180)
    await urlText.hover()
    await page.mouse.wheel(0, 300)
    await expect
      .poll(() => urlText.evaluate((node) => node.scrollTop))
      .toBeGreaterThan(0)
    await expect(titleText).toBeVisible()
    await urlText.evaluate((node) => {
      node.scrollTop = 0
    })
    expect(
      await scroll.evaluate((node) => node.clientHeight),
    ).toBeLessThanOrEqual(480)
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
    await card.hover()
    // Headless Chromium has no OS window, so deliver its focus-loss event.
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect(card).toBeHidden()
  } finally {
    await browserContext.close()
  }
})

test('keep the tooltip attached after resizing and retain selection dragged outside it', async () => {
  const { browserContext, page, extensionURL } = await initBrowserWithExtension(
    { headless: true },
  )
  try {
    await closeCurrentWindowTabsExceptActive(page, extensionURL)
    await page.evaluate(async () => {
      await chrome.storage.sync.set({
        showTabTooltip: true,
        tabTooltipUrlLines: 3,
        showSearchResultMenu: false,
      })
    })
    const title = 'Long research title 研究 and selectable text '.repeat(100)
    const url =
      'https://example.com/resize-tooltip?notes=' + 'reference-'.repeat(1200)
    await browserContext.route('https://example.com/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body:
          '<title>' +
          (route.request().url().includes('resize-tooltip')
            ? title
            : 'Short fixture') +
          '</title>',
      }),
    )
    for (let i = 0; i < 11; i++) {
      const fixture = await browserContext.newPage()
      await fixture.goto('https://example.com/short-tooltip-' + i)
    }
    const fixture = await browserContext.newPage()
    await fixture.goto(url)
    await page.bringToFront()
    const tab = await page.evaluate(
      async (url) =>
        (await chrome.tabs.query({})).find((tab) => tab.url === url),
      url,
    )
    await page.reload()
    const row = page.getByTestId('tab-row-' + tab.id)
    await row.scrollIntoViewIfNeeded()
    const anchor = row.locator('button[aria-haspopup="dialog"]')
    await anchor.hover()
    const card = page.getByRole('dialog', { name: 'Tab details', exact: true })
    await expect(card).toBeVisible()
    await card.hover()
    const initial = await card.boundingBox()
    await card
      .getByRole('button', { name: 'Show full title', exact: true })
      .click()
    await card
      .getByRole('button', { name: 'Show full URL', exact: true })
      .click()
    await card
      .getByRole('button', { name: 'Show less title', exact: true })
      .click()
    await card
      .getByRole('button', { name: 'Show less URL', exact: true })
      .click()
    await expect
      .poll(async () => Math.abs((await card.boundingBox()).y - initial.y))
      .toBeLessThanOrEqual(2)
    await card.hover()
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
    const text = await card.getByTestId('tab-tooltip-title').boundingBox()
    const bounds = await card.boundingBox()
    await page.mouse.move(text.x + 4, text.y + 8)
    await page.mouse.down()
    await page.mouse.move(text.x + 180, text.y + 8, { steps: 12 })
    await page.mouse.move(bounds.x - 20, text.y + 28, { steps: 12 })
    await page.waitForTimeout(500)
    await expect(card).toBeVisible()
    await page.mouse.up()
    await page.waitForTimeout(350)
    await expect(card).toBeVisible()
    expect(
      await page.evaluate(() => window.getSelection()?.toString().length),
    ).toBeGreaterThan(5)
    await page.keyboard.press('Escape')
    await expect(card).toBeHidden()
  } finally {
    await browserContext.close()
  }
})
