import { Page, ChromiumBrowserContext, Locator } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  URLS,
  CLOSE_PAGES,
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
  openPages,
  matchImageSnapshotOptions,
  waitForDefaultExtensionView,
  waitForLocatorRectToStabilize,
  waitForSurfaceToFullyAppear,
} from '../util'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

const waitForMainSurfaceToSettle = async (page: Page) => {
  const scrollContainer = page
    .locator('[data-testid="window-list-scroll-container"]')
    .first()
  await expect(scrollContainer).toBeVisible()
  await waitForLocatorRectToStabilize(scrollContainer, {
    minWidth: 300,
    minHeight: 200,
    stableSamples: 3,
  })
}

const waitForSettingsPanelToSettle = async (page: Page) => {
  const panel = page.getByTestId('settings-panel-theme-density')
  await expect(panel).toBeVisible()
  await waitForSurfaceToFullyAppear(page, panel)
}

const screenshotLocatorTop = async (
  page: Page,
  target: Locator,
  maxHeight: number,
) => {
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  if (!box) {
    throw new Error('Unable to capture locator screenshot without a box')
  }

  return page.screenshot({
    clip: {
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.min(Math.round(box.height), maxHeight),
    },
  })
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
      await chrome.storage.sync?.clear?.()
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

  test('support different theme', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await waitForMainSurfaceToSettle(page)
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    let toggleThemeButton = await page.$(
      '[aria-label="Toggle light/dark theme"]',
    )
    await toggleThemeButton.click()
    await waitForMainSurfaceToSettle(page)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.locator('button[aria-label="Settings"]').first().click()
    await waitForSettingsPanelToSettle(page)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    const themedPanel = page.getByTestId('settings-panel-theme-density')
    await expect(themedPanel).toBeVisible()
    await waitForSurfaceToFullyAppear(page, themedPanel)
    expect(await screenshotLocatorTop(page, themedPanel, 586)).toMatchSnapshot(
      matchImageSnapshotOptions,
    )

    await page.keyboard.press('?')
    const shortcutsTable = page.locator('table').first()
    await expect(shortcutsTable).toBeVisible()
    await waitForLocatorRectToStabilize(shortcutsTable, {
      minWidth: 300,
      minHeight: 100,
      stableSamples: 3,
    })
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Escape')
    await waitForSettingsPanelToSettle(page)
    await page.keyboard.press('Escape')
    await waitForMainSurfaceToSettle(page)

    toggleThemeButton = await page.$('[aria-label="Toggle light/dark theme"]')
    await toggleThemeButton.click()
    await waitForMainSurfaceToSettle(page)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)
  })

  test('persist classic interface style across reload', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await waitForMainSurfaceToSettle(page)
    await page.locator('button[aria-label="Settings"]').first().click()
    await waitForSettingsPanelToSettle(page)

    let uiPresetGroup = page.getByTestId('settings-ui-preset-toggle-group')
    await expect(uiPresetGroup).toBeVisible()
    let classicButton = uiPresetGroup.getByRole('radio', {
      name: 'Use classic interface style',
    })
    await classicButton.click()
    await waitForSettingsPanelToSettle(page)
    await expect(classicButton).toHaveAttribute('aria-checked', 'true')

    const duplicatePreview = page
      .getByTestId('row-details-preview-duplicates')
      .locator('[data-testid^="tab-duplicate-marker-"]')
      .first()
    await expect(duplicatePreview).toHaveCSS('opacity', '0')
    await expect(
      page.locator('button[aria-label="Settings"]').first(),
    ).not.toHaveClass(/Mui-disabled/)

    expect(
      await page.evaluate(async () => {
        const result = await chrome.storage.sync.get(['uiPreset'])
        return result.uiPreset
      }),
    ).toBe('classic')

    await page.reload()
    await waitForMainSurfaceToSettle(page)
    await page.locator('button[aria-label="Settings"]').first().click()
    await waitForSettingsPanelToSettle(page)

    uiPresetGroup = page.getByTestId('settings-ui-preset-toggle-group')
    classicButton = uiPresetGroup.getByRole('radio', {
      name: 'Use classic interface style',
    })
    await expect(classicButton).toHaveAttribute('aria-checked', 'true')
    await expect(
      page
        .getByTestId('row-details-preview-duplicates')
        .locator('[data-testid^="tab-duplicate-marker-"]')
        .first(),
    ).toHaveCSS('opacity', '0')
  })

  test('persist window order mode across reload', async () => {
    await page.locator('button[aria-label="Settings"]').first().click()
    await waitForSettingsPanelToSettle(page)

    let windowOrderGroup = page.getByTestId(
      'settings-window-order-toggle-group',
    )
    await expect(windowOrderGroup).toBeVisible()
    let lastUsedButton = windowOrderGroup.getByRole('radio', {
      name: 'Use last used window order',
    })
    await lastUsedButton.click()
    await waitForSettingsPanelToSettle(page)
    await expect(lastUsedButton).toHaveAttribute('aria-checked', 'true')

    expect(
      await page.evaluate(async () => {
        const result = await chrome.storage.sync.get(['windowOrder'])
        return result.windowOrder
      }),
    ).toBe('lastUsed')

    await page.reload()
    await waitForMainSurfaceToSettle(page)
    await page.locator('button[aria-label="Settings"]').first().click()
    await waitForSettingsPanelToSettle(page)

    windowOrderGroup = page.getByTestId('settings-window-order-toggle-group')
    lastUsedButton = windowOrderGroup.getByRole('radio', {
      name: 'Use last used window order',
    })
    await expect(lastUsedButton).toHaveAttribute('aria-checked', 'true')
  })

  test('support font size change', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await waitForMainSurfaceToSettle(page)
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)
    await page.locator('button[aria-label="Settings"]').first().click()
    await waitForSettingsPanelToSettle(page)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    const fontSizeInput = page.locator('[aria-label="Font Size Value"]').first()
    await fontSizeInput.fill('6')
    await waitForSettingsPanelToSettle(page)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await fontSizeInput.fill('36')
    await waitForSettingsPanelToSettle(page)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await fontSizeInput.fill('14')
    await waitForSettingsPanelToSettle(page)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Escape')
    await waitForMainSurfaceToSettle(page)
  })

  test('support toggle always show toolbar', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.locator('button[aria-label="Settings"]').first().click()
    await waitForSettingsPanelToSettle(page)
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    let toogleButton = await page.$(
      '[aria-labelledby="toggle-always-show-toolbar"]',
    )
    await toogleButton.click()

    await waitForSettingsPanelToSettle(page)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    toogleButton = await page.$(
      '[aria-labelledby="toggle-always-show-toolbar"]',
    )
    await toogleButton.click()
    await waitForSettingsPanelToSettle(page)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Escape')
    await waitForMainSurfaceToSettle(page)
  })
})
