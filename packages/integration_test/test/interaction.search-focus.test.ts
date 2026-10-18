import { test, expect } from '@playwright/test'
import {
  initBrowserWithExtension,
  closeCurrentWindowTabsExceptActive,
  openPages,
} from '../util'

for (const lite of [false, true]) {
  test(`restore real result focus after close in ${lite ? 'lite popup' : 'full workspace'}`, async () => {
    const { browserContext, page, extensionURL } =
      await initBrowserWithExtension({ headless: true })
    try {
      await closeCurrentWindowTabsExceptActive(page, extensionURL)
      const urls = ['Alpha', 'Beta', 'Gamma'].map(
        (title) => `data:text/html,<title>Focus fixture ${title}</title>`,
      )
      await openPages(browserContext, urls)
      await page.evaluate(
        async ({ lite }) => {
          const settings = {
            litePopupMode: lite,
            autoFocusSearch: false,
            searchHistory: false,
          }
          await chrome.storage.local.set(settings)
          await chrome.storage.sync.set(settings)
        },
        { lite },
      )
      await page.goto(lite ? extensionURL.split('?')[0] : extensionURL)
      await page.bringToFront()
      const input = page.getByRole('combobox')
      await input.fill('Focus fixture')
      const rows = page.locator('[role="option"][data-result-key^="tab-"]')
      await expect(rows).toHaveCount(3)
      const first = rows.filter({ hasText: 'Focus fixture Alpha' })
      const middle = rows.filter({ hasText: 'Focus fixture Beta' })
      const last = rows.filter({ hasText: 'Focus fixture Gamma' })
      await middle.focus()
      await expect(middle).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(last).toBeFocused()
      await expect(last).toHaveAttribute('aria-selected', 'true')
      // A single close, with other results remaining, must retain DOM focus.
      await page.keyboard.press('d')
      await page.keyboard.press('d')
      await expect(last).toHaveCount(0)
      await expect(middle).toBeFocused()
      await expect(middle).toHaveAttribute('aria-selected', 'true')
      await page.keyboard.press('d')
      await page.keyboard.press('d')
      await expect(middle).toHaveCount(0)
      await expect(first).toBeFocused()
      await page.keyboard.press('d')
      await page.keyboard.press('d')
      await expect(rows).toHaveCount(0)
      await expect(page.getByRole('listbox')).toBeFocused()
      // Empty-result recovery must leave search usable by keyboard.
      await page.keyboard.press('/')
      await expect(input).toBeFocused()
    } finally {
      await browserContext.close()
    }
  })
}
