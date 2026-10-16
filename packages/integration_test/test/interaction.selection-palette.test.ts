import { test, expect } from '@playwright/test'
import type { Page, BrowserContext } from 'playwright'
import {
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
} from '../util'

let page: Page
let browserContext: BrowserContext
let ids: number[]
const panel = () => page.locator('[data-selection-palette]')
const query = () => panel().getByRole('combobox')
const row = (index: number) => page.getByTestId('tab-row-' + ids[index])
const select = async (index: number, checked = true) => {
  const checkbox = row(index).getByRole('checkbox')
  await checkbox.focus()
  await checkbox.setChecked(checked)
}
const focusActions = async () => {
  await page.keyboard.press('Control+Shift+f')
  await expect(query()).toBeFocused()
}

test.beforeEach(async () => {
  const init = await initBrowserWithExtension({ headless: true })
  page = init.page
  browserContext = init.browserContext
  await closeCurrentWindowTabsExceptActive(page, init.extensionURL)
  for (const title of ['Selection Alpha', 'Selection Beta']) {
    const fixture = await browserContext.newPage()
    await fixture.goto('data:text/html,<title>' + title + '</title>Sample')
  }
  await page.bringToFront()
  ids = await page.evaluate(async () =>
    (await chrome.tabs.query({}))
      .filter((tab) => tab.title?.startsWith('Selection '))
      .map((tab) => tab.id),
  )
  await page.reload()
  await expect(row(1)).toBeVisible()
})

test.afterEach(async () => {
  await browserContext?.close()
})

test('keeps the base toolbar stationary and preserves collapse until a new selection session', async () => {
  const base = page.getByRole('group', {
    name: 'Workspace toolbar',
    exact: true,
  })
  const selectAll = base.getByRole('checkbox')
  const original = await selectAll.boundingBox()
  const cards = await page
    .getByTestId('window-list-scroll-container')
    .boundingBox()
  await selectAll.check()
  await expect(query()).toBeVisible()
  expect(await selectAll.boundingBox()).toEqual(original)
  expect(
    await page.getByTestId('window-list-scroll-container').boundingBox(),
  ).toEqual(cards)
  const dock = await page.locator('.toolbar').first().boundingBox()
  const palette = await panel().boundingBox()
  expect(palette.width).toBeLessThanOrEqual(dock.width)
  expect(Math.abs(palette.x - dock.x)).toBeLessThan(2)
  await panel()
    .getByRole('button', { name: /Collapse actions/ })
    .click()
  await expect(query()).toBeHidden()
  await select(0, false)
  await expect(
    panel().getByRole('button', { name: /Expand actions for 2/ }),
  ).toBeVisible()
  await focusActions()
  await query().press('Control+n')
  await expect(panel()).toBeHidden()
  await select(0)
  await expect(query()).toBeVisible()
})

test('focus shortcut returns to the caller and Clear leaves a usable base control', async () => {
  const search = page.getByRole('combobox', {
    name: 'Search tabs or URLs',
    exact: true,
  })
  await search.focus()
  await page.keyboard.press('Control+Shift+f')
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(search).toBeFocused()
  await select(0)
  await search.focus()
  await focusActions()
  await page.keyboard.press('Escape')
  await expect(search).toBeFocused()
  await focusActions()
  await query().fill('clear')
  await query().press('Enter')
  await expect(panel()).toBeHidden()
  await expect(
    page
      .getByRole('group', { name: 'Workspace toolbar' })
      .getByRole('checkbox'),
  ).toBeFocused()
})

test('searches actions, keeps native editing local and routes modifier actions from format steps', async () => {
  await select(0)
  await focusActions()
  await query().pressSequentially('reload')
  await expect(query()).toHaveValue('reload')
  await expect(panel().getByRole('option', { name: /^Reload/ })).toBeVisible()
  await expect(row(0).getByRole('checkbox')).toBeChecked()
  await query().fill('copy as')
  await panel().getByRole('option', { name: 'Copy as…', exact: true }).click()
  await expect(query()).toHaveAccessibleName('Search selection formats')
  // Install a browser API probe in this isolated test extension only.
  await page.evaluate(() => {
    const original = chrome.tabs.reload
    ;(window as any).__selectionReloads = []
    chrome.tabs.reload = ((id, ...args) => {
      ;(window as any).__selectionReloads.push(id)
      return original.call(chrome.tabs, id, ...args)
    }) as typeof original
  })
  await query().press('Control+r')
  await expect
    .poll(() => page.evaluate(() => (window as any).__selectionReloads))
    .toEqual([ids[0]])
  await expect(panel()).toBeHidden()
  await expect(
    page
      .getByRole('group', { name: 'Workspace toolbar' })
      .getByRole('checkbox'),
  ).toBeFocused()
  await select(0)
  await focusActions()
  await query().fill('copy as')
  await panel().getByRole('option', { name: 'Copy as…', exact: true }).click()
  await query().press('Control+u')
  await expect(row(0).getByRole('checkbox')).not.toBeChecked()
  await expect(row(1).getByRole('checkbox')).toBeChecked()
  await query().press('Control+n')
  await expect(panel()).toBeHidden()
})

test('Escape backs out of formats before collapsing and modal palette returns to the handle', async () => {
  await select(0)
  await focusActions()
  await query().fill('export')
  await query().press('Enter')
  await expect(panel().getByRole('option')).toHaveCount(4)
  await query().press('Escape')
  await expect(query()).toHaveAccessibleName('Search selected-tab actions')
  await page.keyboard.press('Alt+k')
  await expect(page.getByTestId('command-palette')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    panel().getByRole('button', { name: /Expand actions/ }),
  ).toBeFocused()
})

test('New window remains directly reachable for a partial selection', async () => {
  const originalWindow = await page.evaluate(
    async (id) => (await chrome.tabs.get(id)).windowId,
    ids[0],
  )
  await select(0)
  await focusActions()
  await query().fill('new window')
  await panel()
    .getByRole('option', { name: /^Move to new window/ })
    .click()
  await expect
    .poll(() =>
      page.evaluate(async (id) => (await chrome.tabs.get(id)).windowId, ids[0]),
    )
    .not.toBe(originalWindow)
  expect(
    await page.evaluate(
      async (id) => (await chrome.tabs.get(id)).windowId,
      ids[1],
    ),
  ).toBe(originalWindow)
  await expect(panel()).toBeHidden()
})

test('dialog Escape release keeps focus at the base toolbar opener without a selection', async () => {
  const search = page.getByRole('combobox', {
    name: 'Search tabs or URLs',
    exact: true,
  })
  await search.focus()
  await page.keyboard.press('Control+Shift+f')
  const settings = page.getByRole('button', { name: 'Settings', exact: true })
  await expect(settings).toBeFocused()
  await settings.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true })
  await expect
    .poll(() =>
      dialog.evaluate((node) => node.contains(document.activeElement)),
    )
    .toBe(true)
  await page.keyboard.down('Escape')
  await expect(dialog).toBeHidden()
  await expect(settings).toBeFocused()
  await page.keyboard.up('Escape')
  await settings.dispatchEvent('keyup', { key: 'Escape', bubbles: true })
  await expect(settings).toBeFocused()
})

for (const dialog of ['settings', 'help'] as const) {
  test(`${dialog} returns to stable toolbar controls from selection search and More`, async () => {
    await select(0)
    await focusActions()
    await page.keyboard.press(dialog === 'settings' ? 'Control+,' : 'Control+/')
    const overlay =
      dialog === 'settings'
        ? page.getByRole('dialog', { name: 'Settings', exact: true })
        : page.getByRole('dialog').filter({
            has: page.getByRole('heading', {
              name: 'Keyboard Shortcuts',
              exact: true,
            }),
          })
    await expect(overlay).toBeVisible()
    await expect
      .poll(() =>
        overlay.evaluate((node) => node.contains(document.activeElement)),
      )
      .toBe(true)
    // Focus can return between keydown and keyup. The release must not also
    // act as a second Escape in the collapsed selection palette.
    await page.keyboard.down('Escape')
    await expect(overlay).toBeHidden()
    await expect(
      panel().getByRole('button', { name: /Expand actions/ }),
    ).toBeFocused()
    await page.keyboard.up('Escape')
    // Also cover a release delivered after the overlay restores its opener.
    await panel()
      .getByRole('button', { name: /Expand actions/ })
      .dispatchEvent('keyup', { key: 'Escape', bubbles: true })
    await expect(
      panel().getByRole('button', { name: /Expand actions/ }),
    ).toBeFocused({ timeout: 3000 })
    const more = page.getByRole('button', { name: 'More toolbar actions' })
    await more.click()
    await page
      .getByRole('menuitem', {
        name: dialog === 'settings' ? 'Settings' : /Keyboard Shortcuts/i,
        exact: true,
      })
      .click()
    await expect(overlay).toBeVisible()
    await expect
      .poll(() =>
        overlay.evaluate((node) => node.contains(document.activeElement)),
      )
      .toBe(true)
    await page.keyboard.press('Escape')
    await expect(more).toBeFocused()
  })
}

for (const recovery of [
  'retry',
  'destination',
  'selection',
  'cancel',
] as const) {
  test(`inline failed move supports ${recovery} without losing focus or reselecting old tabs`, async () => {
    const destination = await page.evaluate(async () => {
      const win = await chrome.windows.create({
        url: 'data:text/html,<title>Destination window</title>',
        focused: false,
      })
      return win.id
    })
    await select(0)
    await focusActions()
    await query().fill('move to window or group')
    await query().press('Enter')
    await expect(query()).toHaveAccessibleName('Search selection destinations')
    await page.evaluate(() => {
      const original = chrome.tabs.move
      chrome.tabs.move = (() => {
        chrome.tabs.move = original
        throw new Error('Tabs cannot currently be edited')
      }) as typeof original
    })
    const destinations = panel().getByRole('option')
    await destinations.last().click()
    await expect(panel().getByRole('alert')).toHaveText(
      'Couldn’t move these tabs.',
    )
    await expect(
      panel().getByRole('button', { name: 'Retry', exact: true }),
    ).toBeFocused()
    if (recovery === 'retry') {
      await page.keyboard.press('Enter')
      await expect(panel().getByRole('alert')).toBeHidden()
      await expect(panel()).toBeHidden()
      await expect(row(0)).toBeFocused()
      await expect
        .poll(() =>
          page.evaluate(
            async (id) => (await chrome.tabs.get(id)).windowId,
            ids[0],
          ),
        )
        .toBe(destination)
    } else if (recovery === 'destination') {
      await page.evaluate((id) => chrome.windows.remove(id), destination)
      const choose = panel().getByRole('button', {
        name: 'Choose another destination',
      })
      await expect(choose).toBeVisible()
      await choose.click()
      await expect(query()).toBeFocused()
      await expect(query()).toHaveValue('')
    } else if (recovery === 'cancel') {
      await panel().getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(
        panel().getByRole('button', { name: /Expand actions/ }),
      ).toBeVisible()
      await expect(row(0).getByRole('checkbox')).toBeChecked()
    } else {
      await select(1)
      await expect(panel().getByRole('alert')).toBeHidden()
      await expect(
        panel().getByRole('button', { name: 'Retry', exact: true }),
      ).toBeHidden()
      await expect(row(0).getByRole('checkbox')).toBeChecked()
      await expect(row(1).getByRole('checkbox')).toBeChecked()
    }
  })
}

for (const mode of ['light', 'dark', 'classic'] as const) {
  test(`selection palette ${mode} view has bounded scrolling at large font sizes`, async () => {
    await page.evaluate(
      async (mode) =>
        chrome.storage.sync.set({
          useSystemTheme: false,
          darkTheme: mode === 'dark',
          uiPreset: mode === 'classic' ? 'classic' : 'modern',
          fontSize: 20,
          increaseContrast: true,
        }),
      mode,
    )
    await page.reload()
    await select(0)
    await focusActions()
    const list = panel().getByRole('listbox')
    await expect
      .poll(() =>
        list.evaluate((node) => node.scrollHeight > node.clientHeight),
      )
      .toBe(true)
    const scrollBefore = await page
      .getByTestId('window-list-scroll-container')
      .evaluate((node) => node.scrollTop)
    await query().press('End')
    for (let i = 0; i < 15; i++) await query().press('ArrowDown')
    expect(
      await page
        .getByTestId('window-list-scroll-container')
        .evaluate((node) => node.scrollTop),
    ).toBe(scrollBefore)
    await query().fill('no-such-selection-action')
    await expect(
      panel().getByRole('status').filter({ hasText: 'No matching actions' }),
    ).toBeVisible()
    await query().fill('')
    await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBe(0)
    await page.mouse.move(10, 10)
    const dock = await page.locator('.toolbar').first().boundingBox()
    const selection = await page.locator('.selection-toolbar').boundingBox()
    await expect(page).toHaveScreenshot(`selection-palette-${mode}.png`, {
      clip: {
        x: dock.x,
        y: selection.y,
        width: dock.width,
        height: dock.y + dock.height - selection.y,
      },
    })
  })
}

test('toolbar More menu stays above its dock when viewport height changes', async () => {
  const more = page.getByRole('button', { name: 'More toolbar actions' })
  await more.click()
  const menu = page.getByRole('menu')
  for (const height of [420, 900, 540]) {
    await page.setViewportSize({ width: 980, height })
    await expect
      .poll(async () => {
        const bounds = await menu.boundingBox()
        const dock = await page.locator('.toolbar').first().boundingBox()
        return bounds.y >= 0 && bounds.y + bounds.height <= dock.y + 1
      })
      .toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(more).toBeFocused()
})

for (const key of ['Enter', 'Escape', 'color Escape']) {
  test(`group editor returns keyboard focus after ${key}`, async () => {
    const groupId = await page.evaluate(async (id) => {
      const group = await chrome.tabs.group({ tabIds: [id] })
      await chrome.tabGroups.update(group, {
        title: 'Sample group',
        color: 'blue',
      })
      return group
    }, ids[0])
    const header = page.getByTestId('tab-group-header-' + groupId)
    await header.press('Shift+F10')
    await page.getByRole('menuitem', { name: /Edit group/ }).click()
    const editor = page.getByTestId('tab-group-editor-' + groupId)
    if (key === 'color Escape') {
      await editor.getByRole('button', { name: 'grey', exact: true }).focus()
      await page.keyboard.press('Escape')
    } else await editor.getByRole('textbox').press(key)
    await expect(editor).toBeHidden()
    await expect(header).toBeFocused()
  })
}
