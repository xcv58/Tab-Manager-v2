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
      .getByTestId('tab-details-shared-preview')
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
        .getByTestId('tab-details-shared-preview')
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
    await settings
      .getByTestId('tab-details-shared-preview')
      .locator('button[aria-haspopup="dialog"]')
      .first()
      .press('Alt+ArrowDown')
    const tooltip = page.getByRole('dialog', {
      name: 'Tab details',
      exact: true,
    })
    await expect(
      tooltip.getByRole('button', { name: 'Copy title' }),
    ).toBeFocused()
    const tooltipControlCount = await tooltip.getByRole('button').count()
    for (let i = 0; i < tooltipControlCount - 1; i++) {
      await page.keyboard.press('Tab')
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest('[aria-modal="true"]'),
        ),
      ).toBe(true)
      await expect(tooltip).toBeVisible()
    }
    await page.keyboard.press('Escape')
    await expect(tooltip).toBeHidden()
    await expect(settings).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('persist independent title and URL limits and exercise the long-title sample', async () => {
    await page.locator('button[aria-label="Settings"]').first().click()
    await selectSettingsSection(page, 'Tab details')
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
    const titleLimit = settings.getByRole('combobox', {
      name: 'Title line limit',
    })
    const urlLimit = settings.getByRole('combobox', { name: 'URL line limit' })
    await expect(titleLimit).toHaveValue('3')
    await expect(urlLimit).toHaveValue('3')
    await titleLimit.selectOption('1')
    await urlLimit.selectOption('5')
    await expect(settings).toHaveScreenshot(
      'settings-title-url-line-limits.png',
      // Release versions change independently of this settings layout.
      { mask: [settings.getByText(/^v\d+\.\d+\.\d+$/)] },
    )
    const sample = settings
      .getByTestId('tab-details-shared-preview')
      .locator('button[aria-haspopup="dialog"]')
      .first()
    const tooltip = page.getByRole('dialog', {
      name: 'Tab details',
      exact: true,
    })
    const title = tooltip.getByTestId('tab-tooltip-title')
    const url = tooltip.getByTestId('tab-tooltip-url')
    for (const limit of ['1', '3', '5', 'full']) {
      await titleLimit.selectOption(limit)
      await sample.press('Alt+ArrowDown')
      await expect(tooltip).toBeVisible()
      expect((await title.textContent()).length).toBeGreaterThan(500)
      await expect(url).toHaveClass(/line-clamp-5/)
      if (limit === 'full') {
        await expect(title).not.toHaveClass(/line-clamp/)
        await expect(
          tooltip.getByRole('button', { name: 'Show full title' }),
        ).toHaveCount(0)
      } else {
        await expect(title).toHaveClass(new RegExp(`line-clamp-${limit}`))
        await expect(
          tooltip.getByRole('button', { name: 'Show full title' }),
        ).toBeVisible()
        if (limit === '1')
          await expect(tooltip).toHaveScreenshot(
            'settings-tooltip-title-one-line.png',
          )
        const completeTitle = await title.textContent()
        await tooltip.getByRole('button', { name: 'Show full title' }).click()
        await expect(title).not.toHaveClass(/line-clamp/)
        await expect(title).toHaveText(completeTitle, { useInnerText: false })
        await tooltip.getByRole('button', { name: 'Show less title' }).click()
        await expect(title).toHaveClass(new RegExp(`line-clamp-${limit}`))
      }
      await page.keyboard.press('Escape')
      await expect(tooltip).toBeHidden()
    }
    await titleLimit.selectOption('5')
    await urlLimit.selectOption('full')
    await expect
      .poll(() =>
        page.evaluate(async () =>
          chrome.storage.sync.get([
            'tabTooltipTitleLines',
            'tabTooltipUrlLines',
          ]),
        ),
      )
      .toEqual({ tabTooltipTitleLines: 5, tabTooltipUrlLines: 'full' })
    await page.reload()
    await page.locator('button[aria-label="Settings"]').first().click()
    await selectSettingsSection(page, 'Tab details')
    await expect(titleLimit).toHaveValue('5')
    await expect(urlLimit).toHaveValue('full')
    await settings
      .getByRole('checkbox', { name: 'Show tab tooltips' })
      .press('Space')
    await expect(titleLimit).toBeDisabled()
    await expect(urlLimit).toBeDisabled()
  })

  test('render one real popup toolbar and isolate sample actions from browser tabs', async () => {
    const browserTabIds = await page.evaluate(async () =>
      (await chrome.tabs.query({})).map((tab) => tab.id).sort(),
    )
    await page.locator('button[aria-label="Settings"]').first().click()
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
    await expect(
      settings.getByRole('textbox', { name: 'Search settings' }),
    ).toBeFocused()
    await selectSettingsSection(page, 'Popup & controls')
    await expect(
      settings.getByRole('textbox', { name: 'Search settings' }),
    ).toBeFocused()
    await settings
      .getByRole('textbox', { name: 'Search settings' })
      .fill('popup controls')
    await settings
      .getByRole('radio', {
        name: 'Show extension icon count for all windows tabs',
      })
      .click()
    const preview = settings.getByTestId('settings-popup-preview')
    const icon = preview.getByTestId('settings-preview-icon-count')
    await expect(icon).toHaveAttribute('data-count', '23')
    const frame = page.frameLocator('iframe[title="Sample Tab Manager popup"]')
    const sampleRow = frame.getByTestId('tab-row-9300')
    await expect(sampleRow).toBeVisible()
    await expect(
      frame.getByRole('button', { name: 'Settings', exact: true }),
    ).toHaveCount(1)
    await expect(settings).toHaveScreenshot('settings-popup-controls.png', {
      // Release versions change independently of this settings layout.
      mask: [settings.getByText(/^v\d+\.\d+\.\d+$/)],
    })
    await sampleRow.hover()
    await sampleRow.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(icon).toHaveAttribute('data-count', '22')
    expect(
      await page.evaluate(async () =>
        (await chrome.tabs.query({})).map((tab) => tab.id).sort(),
      ),
    ).toEqual(browserTabIds)
    await frame
      .getByRole('combobox', { name: 'Search tabs or URLs' })
      .fill('Design review')
    await expect(frame.getByTestId('tab-row-9304')).toBeVisible()
    await frame.getByRole('combobox', { name: 'Search tabs or URLs' }).fill('')
    // Search dismisses its own result list first; a toolbar control supplies
    // an unhandled Escape to the enclosing Settings dialog.
    await frame
      .getByRole('button', { name: 'Sync All Windows' })
      .press('Escape')
    await expect(settings).toBeHidden()
  })

  test('show one-tab app windows in the real workspace layout sample', async () => {
    await page.locator('button[aria-label="Settings"]').first().click()
    await selectSettingsSection(page, 'Windows & layout')
    await page
      .getByRole('checkbox', { name: 'Show app windows in list' })
      .press('Space')
    const preview = page.getByTestId('settings-window-layout-preview')
    await expect(preview).toContainText('7 windows · 24 tabs')
    const app = preview.locator('[data-preview-window="936"]')
    await expect(app).toContainText('1 tab · Music player · App window')
    await expect(app.locator('[data-testid^="tab-row-"]')).toHaveCount(1)
    await expect(
      app.locator('[data-testid^="tab-active-indicator-"]'),
    ).toHaveCount(0)
    await page
      .getByRole('radio', { name: 'Use last used window order' })
      .click()
    await page
      .getByRole('checkbox', { name: 'Auto-fit columns' })
      .press('Space')
    const viewport = preview.locator('.settings-workspace-preview')
    await expect
      .poll(() =>
        viewport.evaluate((node) => node.scrollWidth <= node.clientWidth),
      )
      .toBe(true)
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
    await expect(settings).toHaveScreenshot('settings-search-favicon.png', {
      mask: [settings.getByText(/^v\d+\.\d+\.\d+$/)],
    })
    await search.fill('tab')
    await selectSettingsSection(page, 'Popup & controls')
    await expect(
      settings.getByRole('combobox', { name: 'Jump to section' }),
    ).toHaveCount(0)
    await expect(
      settings.getByRole('heading', { name: 'Popup & controls', exact: true }),
    ).toBeVisible()
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
    ).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 390, height: 720 })
    await page.locator('button[aria-label="Settings"]').first().click()
    await selectSettingsSection(page, 'Appearance')
    await expect(settings).toHaveScreenshot('settings-single-page-narrow.png', {
      mask: [settings.getByText(/^v\d+\.\d+\.\d+$/)],
    })
    expect(
      await settings.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true)
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 1280, height: 720 })
  })
})
