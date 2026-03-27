import { Page, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  CLOSE_PAGES,
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
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
})
