import { Page, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  CLOSE_PAGES,
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
  openPages,
  waitForDefaultExtensionView,
} from '../util'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

type ActiveElementState = {
  testId: string
  ariaLabel: string
  role: string
  text: string
  tagName: string
  type: string
  checked: boolean | null
}

const readActiveElementState = async (
  page: Page,
): Promise<ActiveElementState> =>
  await page.evaluate(() => {
    const node = document.activeElement as
      | (HTMLElement & { checked?: boolean; type?: string })
      | null
    return {
      testId: node?.getAttribute('data-testid') || '',
      ariaLabel: node?.getAttribute('aria-label') || '',
      role: node?.getAttribute('role') || '',
      text: node?.textContent?.replace(/\s+/g, ' ').trim() || '',
      tagName: node?.tagName || '',
      type: node?.getAttribute('type') || '',
      checked:
        typeof node?.checked === 'boolean'
          ? Boolean(node.checked)
          : node?.getAttribute('aria-checked') === 'true'
            ? true
            : node?.getAttribute('aria-checked') === 'false'
              ? false
              : null,
    }
  })

const isActiveElementInsideDialog = async (page: Page) =>
  await page.evaluate(() => {
    return Boolean(document.activeElement?.closest('[role="dialog"]'))
  })

const readVisuallyFocusedRowTestId = async (page: Page) =>
  await page.evaluate(() => {
    return (
      document
        .querySelector<HTMLElement>('[data-testid^="tab-row-"].z-10')
        ?.getAttribute('data-testid') || ''
    )
  })

const focusRowByKeyboardUntil = async (
  page: Page,
  expectedRowTestId: string,
  maxSteps = 40,
) => {
  for (let index = 0; index < maxSteps; index += 1) {
    if ((await readVisuallyFocusedRowTestId(page)) === expectedRowTestId) {
      return
    }
    await page.keyboard.press('j')
    await page.waitForTimeout(50)
  }

  throw new Error(`Unable to focus requested row: ${expectedRowTestId}`)
}

const pressTabUntil = async (
  page: Page,
  predicate: (state: ActiveElementState) => boolean,
  {
    maxSteps = 40,
    reverse = false,
  }: { maxSteps?: number; reverse?: boolean } = {},
) => {
  let state = await readActiveElementState(page)
  if (predicate(state)) {
    return state
  }

  for (let index = 0; index < maxSteps; index += 1) {
    await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab')
    await page.waitForTimeout(50)
    state = await readActiveElementState(page)
    if (predicate(state)) {
      return state
    }
  }

  throw new Error(
    `Unable to focus requested control by ${reverse ? 'Shift+Tab' : 'Tab'} navigation`,
  )
}

const selectSettingsSectionByKeyboard = async (
  page: Page,
  name: string,
  index: number,
) => {
  await pressTabUntil(page, (state) => state.role === 'tab', { maxSteps: 40 })
  await page.keyboard.press('Home')
  for (let step = 0; step < index; step += 1) {
    await page.keyboard.press('ArrowDown')
  }
  await expect(page.getByRole('tab', { name, exact: true })).toBeFocused()
  await expect(page.getByRole('tabpanel', { name, exact: true })).toBeVisible()
  await expect(page.getByRole('tabpanel')).toHaveCount(1)
}

test.describe('The Extension page should', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(60000)
  test.beforeAll(async () => {
    const init = await initBrowserWithExtension()
    browserContext = init.browserContext
    extensionURL = init.extensionURL
    page = init.page
  })

  test.afterAll(async () => {
    await browserContext?.close()
    browserContext = null
    page = null
    extensionURL = ''
  })

  test.beforeEach(async () => {
    if (!extensionURL) {
      console.error('Invalid extensionURL', { extensionURL })
    }
    await page.bringToFront()
    await page.goto(extensionURL)
    await page.evaluate(async () => {
      await chrome.storage.local.clear()
      if (chrome.storage.sync?.clear) {
        await chrome.storage.sync.clear()
      }
    })
    await page.goto(extensionURL)
    await CLOSE_PAGES(browserContext)
    await closeCurrentWindowTabsExceptActive(page, extensionURL)
    await page.goto(extensionURL)
    await waitForDefaultExtensionView(page)
  })

  test.afterEach(async () => {
    await CLOSE_PAGES(browserContext)
  })

  test('support keyboard-only settings switches, toggle groups, sliders, and escape', async () => {
    await page.bringToFront()

    await pressTabUntil(
      page,
      (state) => state.ariaLabel === 'Settings' && state.tagName === 'BUTTON',
      { maxSteps: 20 },
    )
    await page.keyboard.press('Space')

    const settingsDialog = page.getByRole('dialog').first()
    await expect(settingsDialog).toBeVisible()

    await selectSettingsSectionByKeyboard(page, 'Search', 3)
    await pressTabUntil(
      page,
      (state) =>
        state.ariaLabel === 'Preserve search' &&
        state.tagName === 'INPUT' &&
        state.type === 'checkbox',
      { maxSteps: 20 },
    )
    await page.keyboard.press('Space')
    await expect
      .poll(async () => {
        const settings = await page.evaluate(async () => {
          return await chrome.storage.sync.get(['preserveSearch'])
        })
        return settings.preserveSearch
      })
      .toBe(false)

    await selectSettingsSectionByKeyboard(page, 'Appearance', 0)
    await pressTabUntil(
      page,
      (state) =>
        /^Use .* theme$/.test(state.ariaLabel) && state.tagName === 'BUTTON',
      { maxSteps: 20 },
    )
    await page.keyboard.press('ArrowRight')
    await expect(
      page.getByRole('radio', { name: 'Use light theme' }),
    ).toHaveAttribute('aria-checked', 'true')
    await expect
      .poll(async () => {
        return await page.evaluate(async () => {
          const settings = await chrome.storage.sync.get([
            'useSystemTheme',
            'darkTheme',
          ])
          return {
            useSystemTheme: settings.useSystemTheme,
            darkTheme: settings.darkTheme,
          }
        })
      })
      .toMatchObject({
        useSystemTheme: false,
        darkTheme: false,
      })

    await pressTabUntil(
      page,
      (state) =>
        state.ariaLabel === 'Update Font Size' && state.tagName === 'INPUT',
      { maxSteps: 20 },
    )
    await page.keyboard.press('ArrowRight')
    await expect
      .poll(async () => {
        const settings = await page.evaluate(async () => {
          return await chrome.storage.sync.get(['fontSize'])
        })
        return settings.fontSize
      })
      .toBe(15)

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect
      .poll(() => readActiveElementState(page))
      .toMatchObject({
        ariaLabel: 'Settings',
        tagName: 'BUTTON',
      })
  })

  test('trap focus inside the settings dialog and restore the opener', async () => {
    await page.bringToFront()

    await pressTabUntil(
      page,
      (state) => state.ariaLabel === 'Settings' && state.tagName === 'BUTTON',
      { maxSteps: 20 },
    )
    await page.keyboard.press('Space')

    const settingsDialog = page.getByRole('dialog').first()
    await expect(settingsDialog).toBeVisible()

    const firstControl = await pressTabUntil(
      page,
      (state) => state.role === 'tab' && state.text === 'Appearance',
      { maxSteps: 20 },
    )
    expect(firstControl).toMatchObject({ role: 'tab', text: 'Appearance' })

    await page.keyboard.press('Shift+Tab')
    await page.waitForTimeout(50)
    await expect.poll(() => isActiveElementInsideDialog(page)).toBe(true)
    expect(await readActiveElementState(page)).not.toMatchObject({
      ariaLabel: 'Settings',
      tagName: 'BUTTON',
    })

    let wrappedToFirstControl = false
    for (let index = 0; index < 40; index += 1) {
      await page.keyboard.press('Tab')
      await page.waitForTimeout(50)
      await expect.poll(() => isActiveElementInsideDialog(page)).toBe(true)

      const state = await readActiveElementState(page)
      if (state.role === 'tab' && state.text === 'Appearance') {
        wrappedToFirstControl = true
        break
      }
    }

    expect(wrappedToFirstControl).toBe(true)

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect
      .poll(() => readActiveElementState(page))
      .toMatchObject({
        ariaLabel: 'Settings',
        tagName: 'BUTTON',
      })
  })

  test('run an applicable shortcut action after restoring the focused tab', async () => {
    await openPages(browserContext, [
      'data:text/html,<title>Runnable Shortcut</title>shortcut-fixture',
    ])
    await page.bringToFront()
    const row = page
      .locator('[data-testid^="tab-row-"]')
      .filter({ hasText: 'Runnable Shortcut' })
    await expect(row).toBeVisible()
    const rowTestId = await row.getAttribute('data-testid')
    await focusRowByKeyboardUntil(page, rowTestId)
    await page.keyboard.press('?')
    const help = page.getByRole('dialog').first()
    await expect(help.getByTestId('shortcut-help-context')).toContainText(
      'Focused tab: Runnable Shortcut',
    )
    const newWindow = help.getByRole('button', {
      name: /Run: .*selected.*new window/i,
    })
    await expect(newWindow).toBeDisabled()
    await expect(
      help.getByText('Select tabs first', { exact: true }).first(),
    ).toBeVisible()
    await help
      .getByRole('button', {
        name: 'Run: Toggle selection for Runnable Shortcut',
        exact: true,
      })
      .first()
      .click()
    await expect(help).toBeHidden()
    await expect(row.locator('input[type="checkbox"]')).toBeChecked()
    await expect.poll(() => readVisuallyFocusedRowTestId(page)).toBe(rowTestId)
    await page.keyboard.press('?')
    await expect(newWindow).toBeEnabled()
    await help.getByRole('button', { name: /Run: .*command palette/i }).click()
    await expect(
      page.getByRole('dialog', { name: 'Command palette', exact: true }),
    ).toBeVisible()
    await expect(row.locator('input[type="checkbox"]')).toBeChecked()
    await page.keyboard.press('Escape')
  })

  test('skip tab-row preview controls when tabbing through tab display settings', async () => {
    await page.bringToFront()

    await pressTabUntil(
      page,
      (state) => state.ariaLabel === 'Settings' && state.tagName === 'BUTTON',
      { maxSteps: 20 },
    )
    await page.keyboard.press('Space')

    await expect(page.getByRole('dialog')).toHaveCount(1)

    await selectSettingsSectionByKeyboard(page, 'Tab details', 2)
    await pressTabUntil(
      page,
      (state) =>
        state.ariaLabel === 'Mark duplicate tabs' &&
        state.tagName === 'INPUT' &&
        state.type === 'checkbox',
      { maxSteps: 80 },
    )

    await page.keyboard.press('Tab')
    await page.waitForTimeout(50)

    await expect
      .poll(() => readActiveElementState(page))
      .toMatchObject({
        ariaLabel: 'Show tab icons',
        tagName: 'INPUT',
        type: 'checkbox',
      })
  })

  test('keep background row focus unchanged while arrowing inside settings controls', async () => {
    await openPages(browserContext, [
      'data:text/html,<title>Settings Focus A</title><h1>Settings Focus A</h1>',
      'data:text/html,<title>Settings Focus B</title><h1>Settings Focus B</h1>',
    ])
    await page.bringToFront()
    await page.waitForTimeout(800)

    const rowTestIds = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid^="tab-row-"]'),
      ).map((node) => node.dataset.testid || '')
    })

    expect(rowTestIds.length).toBeGreaterThan(1)

    const targetRowTestId = rowTestIds[0]
    await focusRowByKeyboardUntil(page, targetRowTestId, rowTestIds.length + 4)
    await expect
      .poll(() => readVisuallyFocusedRowTestId(page))
      .toBe(targetRowTestId)

    await page.keyboard.press('Control+,')
    await expect(page.getByRole('dialog')).toHaveCount(1)

    await selectSettingsSectionByKeyboard(page, 'Popup & controls', 4)
    await pressTabUntil(
      page,
      (state) =>
        /^Show extension icon count for .* tabs$/.test(state.ariaLabel) &&
        state.role === 'radio' &&
        state.tagName === 'BUTTON',
      { maxSteps: 80 },
    )

    await page.keyboard.press('ArrowRight')

    await expect(
      page.getByRole('radio', {
        name: 'Show extension icon count for window tabs',
      }),
    ).toHaveAttribute('aria-checked', 'true')
    await expect
      .poll(() => readVisuallyFocusedRowTestId(page))
      .toBe(targetRowTestId)
  })
})
