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
  selectSettingsSection,
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

const waitForSettingsPanelToSettle = async (
  page: Page,
  name: Parameters<typeof selectSettingsSection>[1] = 'Appearance',
) => selectSettingsSection(page, name)

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
    expect(await screenshotLocatorTop(page, themedPanel, 585)).toMatchSnapshot(
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

    await selectSettingsSection(page, 'Tab details')
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
    await selectSettingsSection(page, 'Tab details')
    await expect(
      page
        .getByTestId('row-details-preview-duplicates')
        .locator('[data-testid^="tab-duplicate-marker-"]')
        .first(),
    ).toHaveCSS('opacity', '0')
  })

  test('persist window order mode across reload', async () => {
    await page.locator('button[aria-label="Settings"]').first().click()
    await waitForSettingsPanelToSettle(page, 'Windows & layout')

    let windowOrderGroup = page.getByTestId(
      'settings-window-order-toggle-group',
    )
    await expect(windowOrderGroup).toBeVisible()
    let lastUsedButton = windowOrderGroup.getByRole('radio', {
      name: 'Use last used window order',
    })
    await lastUsedButton.click()
    await waitForSettingsPanelToSettle(page, 'Windows & layout')
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
    await waitForSettingsPanelToSettle(page, 'Windows & layout')

    windowOrderGroup = page.getByTestId('settings-window-order-toggle-group')
    lastUsedButton = windowOrderGroup.getByRole('radio', {
      name: 'Use last used window order',
    })
    await expect(lastUsedButton).toHaveAttribute('aria-checked', 'true')
  })

  test('persist contrast and all-window active-tab settings across reload', async () => {
    await page.locator('button[aria-label="Settings"]').first().click()
    await waitForSettingsPanelToSettle(page)

    const contrastToggle = page.getByRole('checkbox', {
      name: 'Increase contrast',
    })
    await expect(contrastToggle).toBeVisible()
    await page
      .getByTestId('settings-increase-contrast')
      .getByTestId('switch-track')
      .click()

    await selectSettingsSection(page, 'Tab details')
    const activeTabsToggle = page.getByRole('checkbox', {
      name: 'Highlight all active tabs',
    })
    await expect(activeTabsToggle).toBeVisible()
    await page
      .getByTestId('row-details-option-active-tabs')
      .getByTestId('switch-track')
      .click()

    await expect
      .poll(async () => {
        return await page.evaluate(async () => {
          const result = await chrome.storage.sync.get([
            'increaseContrast',
            'highlightActiveTabsInAllWindows',
          ])
          return {
            increaseContrast: result.increaseContrast,
            highlightActiveTabsInAllWindows:
              result.highlightActiveTabsInAllWindows,
          }
        })
      })
      .toEqual({
        increaseContrast: true,
        highlightActiveTabsInAllWindows: true,
      })

    await expect(page.locator('main')).toHaveAttribute(
      'data-increase-contrast',
      'true',
    )

    await page.reload()
    await waitForMainSurfaceToSettle(page)
    await page.locator('button[aria-label="Settings"]').first().click()
    await waitForSettingsPanelToSettle(page)

    await expect(
      page.getByRole('checkbox', { name: 'Increase contrast' }),
    ).toBeChecked()
    await selectSettingsSection(page, 'Tab details')
    await expect(
      page.getByRole('checkbox', {
        name: 'Highlight all active tabs',
      }),
    ).toBeChecked()
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
    await waitForSettingsPanelToSettle(page, 'Popup & controls')
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    let toogleButton = await page.$('[aria-label="Toggle Always Show Toolbar"]')
    await toogleButton.click()

    await waitForSettingsPanelToSettle(page, 'Popup & controls')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    toogleButton = await page.$('[aria-label="Toggle Always Show Toolbar"]')
    await toogleButton.click()
    await waitForSettingsPanelToSettle(page, 'Popup & controls')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Escape')
    await waitForMainSurfaceToSettle(page)
  })

  test('keyboard tooltip preview stays within Settings and closes before the modal', async () => {
    await page.locator('button[aria-label="Settings"]').first().click()
    await selectSettingsSection(page, 'Tab details')
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
    await settings.getByRole('button', { name: 'Open example details' }).click()
    const tooltip = page.getByRole('dialog', {
      name: 'Tab details',
      exact: true,
    })
    await expect(
      tooltip.getByRole('button', { name: 'Copy title' }),
    ).toBeFocused()
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest('[aria-modal="true"]'),
        ),
      ).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(tooltip).toBeHidden()
    await expect(settings).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('scroll continuously with sticky section titles, search settings, and remember position', async () => {
    await page.setViewportSize({ width: 1280, height: 600 })
    await page.locator('button[aria-label="Settings"]').first().click()
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
    const scroll = page.getByTestId('settings-scroll')
    await expect(settings.locator('.settings-section')).toHaveCount(5)
    await expect(settings.getByRole('tablist')).toHaveCount(0)
    await selectSettingsSection(page, 'Windows & layout')
    const top = await scroll.evaluate((node) => node.scrollTop)
    const heading = settings.locator(
      '#settings-section-windows-layout .settings-section-heading',
    )
    const box = await scroll.boundingBox()
    await page.mouse.move(box.x + box.width - 12, box.y + 100)
    await page.mouse.wheel(0, 80)
    await expect
      .poll(() => scroll.evaluate((node) => node.scrollTop))
      .toBeGreaterThan(top)
    await expect
      .poll(async () => Math.abs((await heading.boundingBox()).y - box.y))
      .toBeLessThanOrEqual(2)
    const saved = await scroll.evaluate((node) => node.scrollTop)
    const search = settings.getByRole('textbox', { name: 'Search settings' })
    await search.fill('favicon')
    await expect(settings.locator('.settings-section')).toHaveCount(1)
    await expect(
      settings.getByRole('checkbox', { name: 'Show tab icons' }),
    ).toBeVisible()
    await expect(settings.getByRole('status')).toHaveText('1 matching setting')
    await expect(settings).toHaveScreenshot('settings-search-favicon.png')
    await search.fill('tab')
    await selectSettingsSection(page, 'Popup & controls')
    const jump = settings.getByRole('combobox', { name: 'Jump to section' })
    await expect(jump).toHaveValue('popup-controls')
    await jump.press('Tab')
    await expect(
      settings.getByRole('heading', { name: 'Popup & controls', exact: true }),
    ).toBeFocused()
    await settings
      .getByRole('button', { name: 'Clear settings search' })
      .click()
    await expect
      .poll(() => scroll.evaluate((node) => node.scrollTop))
      .toBeCloseTo(saved, 0)
    await selectSettingsSection(page, 'Search')
    const searchPosition = await scroll.evaluate((node) => node.scrollTop)
    await page.keyboard.press('Escape')
    await page.locator('button[aria-label="Settings"]').first().click()
    await expect
      .poll(() => scroll.evaluate((node) => node.scrollTop))
      .toBeCloseTo(searchPosition, 0)
    await expect(
      settings.getByRole('combobox', { name: 'Jump to section' }),
    ).toHaveValue('search')
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 390, height: 720 })
    await page.locator('button[aria-label="Settings"]').first().click()
    await selectSettingsSection(page, 'Appearance')
    await expect(settings).toHaveScreenshot('settings-single-page-narrow.png')
    expect(
      await settings.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true)
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 1280, height: 720 })
  })
})
