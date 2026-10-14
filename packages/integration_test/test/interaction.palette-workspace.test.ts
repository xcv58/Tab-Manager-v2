import { test, expect } from '@playwright/test'
import {
  initBrowserWithExtension,
  closeCurrentWindowTabsExceptActive,
} from '../util'

test('lite popup offers quick actions and routes Settings into the full view', async () => {
  const { browserContext, page, extensionURL } = await initBrowserWithExtension(
    { headless: true },
  )
  try {
    await closeCurrentWindowTabsExceptActive(page, extensionURL)
    await page.evaluate(async () => {
      await chrome.tabs.create({
        url: 'data:text/html,<title>Lite quick target</title>',
        active: false,
      })
      await chrome.storage.sync.set({ litePopupMode: true })
    })
    await page.goto(extensionURL.replace('?not_popup=1', ''))
    await page
      .getByRole('combobox', { name: 'Search tabs or URLs' })
      .fill('Lite quick target')
    await page
      .getByRole('listbox')
      .getByRole('button', { name: /Lite quick target/ })
      .press('Shift+F10')
    const menu = page.getByRole('menu')
    await expect(
      menu.getByRole('menuitem', {
        name: 'Copy this tab’s title',
        exact: true,
      }),
    ).toBeVisible()
    await expect(
      menu.getByRole('menuitem', { name: /Move|Close other|Create a group/ }),
    ).toHaveCount(0)
    await page.keyboard.press('Escape')
    const more = page.getByRole('button', { name: 'More actions', exact: true })
    await more.click()
    await page.getByRole('menuitem', { name: /Command palette/ }).click()
    const palette = page.getByTestId('command-palette')
    await palette
      .getByRole('combobox', { name: 'Search commands' })
      .fill('export csv')
    await expect(
      palette.getByRole('option', { name: /Open full Tab Manager/ }),
    ).toBeVisible()
    await expect(
      palette.getByRole('option', { name: /^Export |^Copy as CSV/ }),
    ).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(more).toBeFocused()
    await more.click()
    const [full] = await Promise.all([
      browserContext.waitForEvent('page'),
      page
        .getByRole('menuitem', { name: 'Settings in full view', exact: true })
        .click(),
    ])
    await expect(
      full.getByRole('dialog', { name: 'Settings', exact: true }),
    ).toBeVisible()
    expect(new URL(full.url()).searchParams.has('not_popup')).toBe(true)
  } finally {
    await browserContext.close()
  }
})

test('palette preserves the mounted search list, scroll and a deep result', async () => {
  const { browserContext, page, extensionURL } = await initBrowserWithExtension(
    { headless: true },
  )
  try {
    await closeCurrentWindowTabsExceptActive(page, extensionURL)
    const tabId = await page.evaluate(async () => {
      let lastId = 0
      for (let i = 0; i < 40; i++)
        lastId = (
          await chrome.tabs.create({
            url: 'data:text/html,<title>Palette result ' + i + '</title>',
            active: false,
          })
        ).id
      return lastId
    })
    await page.reload()
    await page.getByRole('combobox', { name: 'Search tabs or URLs' }).click()
    const scroller = page
      .getByRole('listbox', { includeHidden: true })
      .first()
      .locator('div')
      .first()
    await scroller.evaluate((node) => {
      node.scrollTop = node.scrollHeight
    })
    const result = page.getByTestId('search-tab-row-' + tabId)
    await expect(result).toBeVisible()
    await result.press('Shift+F10')
    await expect(page.getByRole('menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(result).toBeFocused()
    const before = await scroller.evaluate((node) => node.scrollTop)
    const original = await result.elementHandle()
    await page.keyboard.press('Alt+k')
    const palette = page.getByTestId('command-palette')
    await expect(palette).toBeVisible()
    expect(await original.evaluate((node) => node.isConnected)).toBe(true)
    await expect(result.locator('xpath=ancestor::*[@inert]')).toHaveCount(1)
    expect(await scroller.evaluate((node) => node.scrollTop)).toBe(before)
    await page.keyboard.press('Escape')
    await expect(palette).toBeHidden()
    await expect(result).toBeFocused()
    expect(await scroller.evaluate((node) => node.scrollTop)).toBe(before)
  } finally {
    await browserContext.close()
  }
})

for (const recovery of ['retry', 'cancel', 'destination'] as const) {
  test(`palette move failure offers ${recovery} recovery`, async () => {
    const { browserContext, page, extensionURL } =
      await initBrowserWithExtension({ headless: true })
    try {
      await closeCurrentWindowTabsExceptActive(page, extensionURL)
      const ids = await page.evaluate(async () => {
        const source = await chrome.tabs.create({
          url: 'data:text/html,<title>Move source</title>',
          active: false,
        })
        const destination = await chrome.tabs.create({
          url: 'data:text/html,<title>Move destination</title>',
          active: false,
        })
        return { source: source.id, destination: destination.id }
      })
      await page.reload()
      const selectionControl = page
        .getByTestId('tab-row-' + ids.source)
        .getByRole('checkbox')
      await selectionControl.focus()
      await selectionControl.check()
      await page.getByTestId('tab-row-' + ids.destination).press('Shift+F10')
      await page.keyboard.press('Escape')
      await page.keyboard.press('Alt+k')
      const palette = page.getByTestId('command-palette')
      await palette
        .getByRole('combobox', { name: 'Search commands' })
        .fill('before this tab')
      await page.evaluate(() => {
        const move = chrome.tabs.move
        chrome.tabs.move = (() => {
          chrome.tabs.move = move
          throw new Error('Tabs cannot currently be edited')
        }) as typeof move
      })
      await palette.getByRole('option', { name: /before this tab/ }).click()
      await expect(palette.getByRole('alert')).toHaveText(
        'Couldn’t move these tabs.',
      )
      await expect(
        palette.getByRole('button', { name: 'Retry', exact: true }),
      ).toBeFocused()
      await palette.screenshot({
        path: test.info().outputPath('palette-move-error.png'),
      })
      if (recovery === 'retry') {
        await palette
          .getByRole('button', { name: 'Retry', exact: true })
          .click()
        await expect(palette).toBeHidden()
      } else if (recovery === 'cancel') {
        await palette
          .getByRole('button', { name: 'Cancel', exact: true })
          .click()
        await expect(palette).toBeHidden()
        await expect(
          page.getByTestId('tab-row-' + ids.source).getByRole('checkbox'),
        ).toBeChecked()
      } else {
        await page.evaluate((id) => chrome.tabs.remove(id), ids.destination)
        await palette
          .getByRole('button', { name: 'Choose another destination' })
          .click()
        await expect(
          palette.getByRole('combobox', { name: 'Search destinations' }),
        ).toBeVisible()
      }
    } finally {
      await browserContext.close()
    }
  })
}

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
      await expect(result).toHaveCount(1)
      await expect(result.locator('xpath=ancestor::*[@inert]')).toHaveCount(1)
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
      if (lite) {
        await expect(
          palette.getByRole('option', { name: /Edit group/ }),
        ).toHaveCount(0)
        await query.fill('move')
        await expect(
          palette.getByRole('option', { name: /Open full Tab Manager/ }),
        ).toBeVisible()
      } else {
        await expect(
          palette.getByRole('option', {
            name: /Edit group “Collapsed command group”/,
          }),
        ).toBeVisible()
      }
      for (let toggles = 0; !lite && toggles < 2; toggles++) {
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

test('palette shares context availability and lite popup retains quick tab details', async () => {
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
    await expect(
      palette.getByRole('option', { name: /Edit group/ }),
    ).toHaveCount(0)
    await expect(editor).toBeHidden()
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
