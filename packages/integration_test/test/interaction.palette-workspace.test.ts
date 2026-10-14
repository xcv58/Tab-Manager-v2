import { test, expect } from '@playwright/test'
import {
  initBrowserWithExtension,
  closeCurrentWindowTabsExceptActive,
} from '../util'

test('copy Markdown with literal entities through the palette', async () => {
  const { browserContext, page, extensionURL } = await initBrowserWithExtension(
    { headless: true },
  )
  try {
    await closeCurrentWindowTabsExceptActive(page, extensionURL)
    const url = 'https://example.test/?q=&copy;&name=1'
    await browserContext.route(url, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<title>&amp;copy; reference</title>fixture',
      }),
    )
    const fixture = await browserContext.newPage()
    await fixture.goto(url)
    await page.bringToFront()
    const tabId = await page.evaluate(
      async (url) =>
        (await chrome.tabs.query({})).find((tab) => tab.url === url).id,
      url,
    )
    await page.reload()
    await page.getByTestId('tab-row-' + tabId).click({ button: 'right' })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Alt+k')
    const palette = page.getByTestId('command-palette')
    await palette
      .getByRole('combobox', { name: 'Search commands' })
      .fill('copy markdown')
    await palette.getByRole('option', { name: /Copy this tab as/ }).click()
    await browserContext.grantPermissions(['clipboard-read', 'clipboard-write'])
    await palette
      .getByRole('option', { name: /Copy as Markdown links/ })
      .click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      '- [\\&copy; reference](<https://example.test/?q=&amp;copy;&amp;name=1>)',
    )
    await expect(palette).toBeVisible()
    expect(await fixture.title()).toBe('&copy; reference')
    expect(await fixture.url()).toBe(url)
  } finally {
    await browserContext.close()
  }
})

for (const lite of [false, true]) {
  test(`retain collapsed-group search context in the ${lite ? 'lite popup' : 'full workspace'}`, async () => {
    const { browserContext, page, extensionURL } =
      await initBrowserWithExtension({ headless: true })
    try {
      await closeCurrentWindowTabsExceptActive(page, extensionURL)
      const fixture = await browserContext.newPage()
      await fixture.goto(
        'data:text/html,<title>Collapsed command target</title>fixture',
      )
      await page.bringToFront()
      const { tabId, groupId } = await page.evaluate(async (lite) => {
        const tab = (await chrome.tabs.query({})).find(
          (tab) => tab.title === 'Collapsed command target',
        )
        const groupId = await chrome.tabs.group({
          tabIds: [tab.id],
          createProperties: { windowId: tab.windowId },
        })
        await chrome.tabGroups.update(groupId, {
          title: 'Collapsed command group',
          color: 'blue',
          collapsed: true,
        })
        await chrome.storage.sync.set({
          litePopupMode: lite,
          showSearchResultMenu: true,
          showTabTooltip: true,
        })
        return { tabId: tab.id, groupId }
      }, lite)
      await page.goto(
        lite ? extensionURL.replace('?not_popup=1', '') : extensionURL,
      )
      const search = page.getByRole('combobox', { name: 'Search tabs or URLs' })
      await search.fill('')
      await search.click()
      const result = page.getByTestId('search-tab-row-' + tabId)
      await expect(result).toBeVisible()
      await expect(
        result.getByRole('button', { name: /Reveal .* in list/ }),
      ).toHaveCount(0)
      await result.click({ button: 'right' })
      await expect(page.getByRole('menu')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('menu')).toBeHidden()
      await expect(result).toBeFocused()
      await page.keyboard.press('Alt+k')
      await expect(page.getByTestId('command-palette')).toBeVisible()
      await expect(result).toHaveCount(0)
      await page.keyboard.press('Escape')
      await expect(page.getByTestId('command-palette')).toBeHidden()
      await expect(result).toBeFocused()
      await page.keyboard.press('Alt+ArrowDown')
      const details = page.getByRole('dialog', {
        name: 'Tab details',
        exact: true,
      })
      await expect(details.getByTestId('tab-tooltip-title')).toHaveText(
        'Collapsed command target',
      )
      await expect(
        details.getByRole('button', { name: 'Copy title' }),
      ).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(details).toBeHidden()
      await expect(result).toBeVisible()
      await page.keyboard.press('Alt+k')
      const palette = page.getByTestId('command-palette')
      const query = palette.getByRole('combobox', { name: 'Search commands' })
      await query.fill('edit group')
      await expect(
        palette.getByRole('option', {
          name: /Edit group “Collapsed command group”/,
        }),
      ).toBeVisible()
      for (let toggles = 0; toggles < 2; toggles++) {
        await query.fill('Toggle selection for this tab')
        const toggle = palette.getByRole('option', {
          name: /Toggle selection for this tab/,
        })
        await expect(toggle).not.toHaveAttribute('aria-disabled', 'true')
        await toggle.click()
        await page.keyboard.press('Alt+k')
      }
      await browserContext.grantPermissions([
        'clipboard-read',
        'clipboard-write',
      ])
      await query.fill('copy this tab URL')
      const copy = palette.getByRole('option', { name: /Copy this tab’s URL/ })
      await expect(copy).not.toHaveAttribute('aria-disabled', 'true')
      await copy.click()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        await fixture.url(),
      )
      expect(
        await page.evaluate(
          async (id) => (await chrome.tabGroups.get(id)).collapsed,
          groupId,
        ),
      ).toBe(true)
      await expect(search).toHaveValue('')
    } finally {
      await browserContext.close()
    }
  })
}

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
