import { test, expect } from '@playwright/test'
import {
  initBrowserWithExtension,
  closeCurrentWindowTabsExceptActive,
} from '../util'

test('palette shares context availability, edits groups in lite popup and opens searchable tab details', async () => {
  const { browserContext, page, extensionURL } = await initBrowserWithExtension(
    { headless: true },
  )
  try {
    await closeCurrentWindowTabsExceptActive(page, extensionURL)
    const fixtures = ['Palette Alpha', 'Palette Beta']
    for (const title of fixtures) {
      const fixture = await browserContext.newPage()
      await fixture.goto('data:text/html,<title>' + title + '</title>fixture')
    }
    await page.bringToFront()
    const setup = await page.evaluate(async () => {
      const tabs = (await chrome.tabs.query({})).filter((tab) =>
        tab.title?.startsWith('Palette '),
      )
      const groupId = await chrome.tabs.group({
        tabIds: tabs.map((tab) => tab.id),
      })
      await chrome.tabGroups.update(groupId, {
        title: 'Palette Work',
        color: 'blue',
        collapsed: false,
      })
      return {
        groupId,
        tabId: tabs.find((tab) => tab.title === 'Palette Alpha').id,
      }
    })
    await page.reload()
    const row = page.getByTestId('tab-row-' + setup.tabId)
    await row.click({ button: 'right' })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Alt+k')
    const palette = page.getByTestId('command-palette')
    const query = palette.getByRole('combobox', { name: 'Search commands' })
    await query.fill('Open Settings')
    await palette.getByRole('option', { name: /Open Settings/ }).click()
    await expect(
      page.getByRole('dialog', { name: 'Settings', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(row).toBeFocused()
    await page.keyboard.press('Alt+k')
    await query.fill('')
    await expect(
      palette.getByRole('option', {
        name: /Create a group from selected tabs/,
      }),
    ).toHaveAttribute('aria-disabled', 'true')
    await query.fill('toggle selection in')
    await expect(
      palette.getByRole('option', { name: /Toggle selection in this group/ }),
    ).toBeVisible()
    await query.fill('edit group')
    await page.keyboard.press('Enter')
    const editor = page.getByTestId('tab-group-editor-' + setup.groupId)
    await expect(editor).toBeVisible()
    await editor.locator('input').fill('Edited Palette Work')
    await editor.locator('input').press('Enter')
    await expect
      .poll(() =>
        page.evaluate(
          async (id) => (await chrome.tabGroups.get(id)).title,
          setup.groupId,
        ),
      )
      .toBe('Edited Palette Work')
    await page.keyboard.press('Escape')
    await page.evaluate(async () => {
      await chrome.storage.sync.set({
        litePopupMode: true,
        showTabTooltip: true,
      })
    })
    await page.goto(extensionURL.replace('?not_popup=1', ''))
    const search = page.getByRole('combobox', { name: 'Search tabs or URLs' })
    await search.fill('Palette Alpha')
    const result = page.getByTestId('search-tab-row-' + setup.tabId)
    await expect(result).toBeVisible()
    await result.click({ button: 'right' })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Alt+k')
    await query.fill('edit group')
    await page.keyboard.press('Enter')
    await expect(editor).toBeVisible()
    await expect(editor.locator('input')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(search).toHaveValue('Palette Alpha')
    await page.keyboard.press('Alt+k')
    await query.fill('show title URL')
    await palette
      .getByRole('option', { name: /Show this tab’s title and URL/ })
      .click()
    const details = page.getByRole('dialog', {
      name: 'Tab details',
      exact: true,
    })
    await expect(details.getByTestId('tab-tooltip-title')).toHaveText(
      'Palette Alpha',
    )
    await expect(
      details.getByRole('button', { name: 'Copy title' }),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(search).toHaveValue('Palette Alpha')
  } finally {
    await browserContext.close()
  }
})

test('blank workspace right click offers global actions even when search has no results', async () => {
  const { browserContext, page, extensionURL } = await initBrowserWithExtension(
    { headless: true },
  )
  try {
    await closeCurrentWindowTabsExceptActive(page, extensionURL)
    const search = page.getByRole('combobox', { name: 'Search tabs or URLs' })
    await search.fill('no-matching-workspace-fixture')
    const canvas = page.locator('main')
    const bounds = await canvas.boundingBox()
    await page.mouse.click(bounds.x + 400, bounds.y + bounds.height - 120, {
      button: 'right',
    })
    const menu = page.getByTestId('workspace-menu')
    await expect(menu).toBeVisible()
    await expect(
      menu.getByRole('menuitem', { name: 'Command palette', exact: true }),
    ).toBeVisible()
    await expect(
      menu.getByRole('menuitem', { name: 'Open Settings', exact: true }),
    ).toBeVisible()
    await expect(menu).toHaveScreenshot('workspace-empty-context-menu.png')
    await menu
      .getByRole('menuitem', { name: 'Open Settings', exact: true })
      .click()
    await expect(
      page.getByRole('dialog', { name: 'Settings', exact: true }),
    ).toBeVisible()
  } finally {
    await browserContext.close()
  }
})
