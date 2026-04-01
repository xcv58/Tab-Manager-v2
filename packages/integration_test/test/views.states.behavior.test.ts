import { Page, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  WINDOW_CARD_QUERY,
  URLS,
  CLOSE_PAGES,
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
  openPages,
  groupTabsByUrl,
  waitForDefaultExtensionView,
  waitForLocatorRectToStabilize,
  waitForTestId,
} from '../util'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

const snapShotOptions = { maxDiffPixelRatio: 0.18, threshold: 0.2 }

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

  test('render window title state variants', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
      await chrome.windows.create({
        url: 'data:text/html,window-state-second',
        focused: false,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,window-state-match',
      'data:text/html,window-state-hidden-a',
      'data:text/html,window-state-hidden-b',
    ])
    await page.bringToFront()
    await page.waitForTimeout(900)
    await page.reload()

    const allWindows = page.locator(WINDOW_CARD_QUERY)
    await expect(allWindows).toHaveCount(2)
    await expect(allWindows.first()).toBeVisible()
    await expect(allWindows.nth(1)).toBeVisible()
    const focusedWindowId = await page.evaluate(async () => {
      const focusedWindow = await chrome.windows.getLastFocused()
      return focusedWindow.id ?? -1
    })
    const focusedWindow =
      focusedWindowId > -1
        ? page.getByTestId(`window-card-${focusedWindowId}`)
        : allWindows.first()
    const unfocusedWindowId = await page.evaluate(async (id) => {
      const windows = await chrome.windows.getAll()
      const unfocusedWindow = windows.find((window) => window.id !== id)
      return unfocusedWindow?.id ?? -1
    }, focusedWindowId)
    const unfocusedWindow =
      unfocusedWindowId > -1
        ? page.getByTestId(`window-card-${unfocusedWindowId}`)
        : allWindows.nth(1)
    await expect(focusedWindow).toBeVisible()
    await expect(unfocusedWindow).toBeVisible()
    await waitForLocatorRectToStabilize(focusedWindow, {
      minWidth: 250,
      minHeight: 120,
      stableSamples: 3,
    })
    await waitForLocatorRectToStabilize(unfocusedWindow, {
      minWidth: 250,
      minHeight: 120,
      stableSamples: 3,
    })
    const focusedShot = await focusedWindow.screenshot()
    expect(focusedShot).toMatchSnapshot('window-card-focused-state.png', {
      maxDiffPixelRatio: 0.2,
      threshold: 0.2,
    })
    const unfocusedShot = await unfocusedWindow.screenshot()
    expect(unfocusedShot).toMatchSnapshot('window-card-unfocused-state.png', {
      maxDiffPixelRatio: 0.2,
      threshold: 0.2,
    })
    const focusedWindowTitle =
      focusedWindowId > -1
        ? page.getByTestId(`window-title-${focusedWindowId}`)
        : focusedWindow.locator('[data-testid^="window-title-"]').first()
    await expect(focusedWindowTitle).toBeVisible()
    await focusedWindowTitle.focus()
    await page.waitForTimeout(150)
    const focusedControlsShot = await focusedWindowTitle.screenshot()
    expect(focusedControlsShot).toMatchSnapshot(
      'window-title-focused-controls.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )

    await page.evaluate(async () => {
      if (chrome.storage.sync?.set) {
        await chrome.storage.sync.set({
          uiPreset: 'classic',
        })
      }
    })
    await page.reload()
    if (focusedWindowId > -1) {
      await waitForTestId(page, `window-card-${focusedWindowId}`)
    }
    if (unfocusedWindowId > -1) {
      await waitForTestId(page, `window-card-${unfocusedWindowId}`)
    }
    const classicWindows = page.locator(WINDOW_CARD_QUERY)
    const focusedClassicWindow =
      focusedWindowId > -1
        ? page.getByTestId(`window-card-${focusedWindowId}`)
        : classicWindows.first()
    const unfocusedClassicWindow =
      unfocusedWindowId > -1
        ? page.getByTestId(`window-card-${unfocusedWindowId}`)
        : classicWindows.nth(1)
    await expect(focusedClassicWindow).toBeVisible()
    await expect(unfocusedClassicWindow).toBeVisible()
    await waitForLocatorRectToStabilize(focusedClassicWindow, {
      minWidth: 250,
      minHeight: 120,
      stableSamples: 3,
    })
    await waitForLocatorRectToStabilize(unfocusedClassicWindow, {
      minWidth: 250,
      minHeight: 120,
      stableSamples: 3,
    })
    const focusedClassicShot = await focusedClassicWindow.screenshot()
    expect(focusedClassicShot).toMatchSnapshot(
      'window-card-focused-state-classic.png',
      {
        maxDiffPixelRatio: 0.2,
        threshold: 0.2,
      },
    )
    const unfocusedClassicShot = await unfocusedClassicWindow.screenshot()
    expect(unfocusedClassicShot).toMatchSnapshot(
      'window-card-unfocused-state-classic.png',
      {
        maxDiffPixelRatio: 0.2,
        threshold: 0.2,
      },
    )

    await page.evaluate(async () => {
      if (chrome.storage.sync?.set) {
        await chrome.storage.sync.set({
          uiPreset: 'modern',
        })
      }
    })
    await page.reload()

    const hiddenGroupId = await groupTabsByUrl(page, {
      urls: [
        'data:text/html,window-state-hidden-a',
        'data:text/html,window-state-hidden-b',
      ],
      title: 'Window Hidden Counter',
      color: 'blue',
    })
    expect(hiddenGroupId).toBeGreaterThan(-1)
    await page.evaluate(async (groupId) => {
      await chrome.tabGroups.update(groupId, { collapsed: true })
    }, hiddenGroupId)
    await page.waitForTimeout(500)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${hiddenGroupId}`)
    const currentWindowId = await page.evaluate(async () => {
      const currentWindow = await chrome.windows.getCurrent()
      return currentWindow.id ?? -1
    })
    expect(currentWindowId).toBeGreaterThan(-1)
    const hiddenCounterTitle = page.getByTestId(
      `window-title-${currentWindowId}`,
    )
    await expect(hiddenCounterTitle).toBeVisible()
    const hideToggle = hiddenCounterTitle.locator(
      'button[aria-label="Toggle window hide"]',
    )
    await hiddenCounterTitle.hover()
    await expect(hideToggle).toBeVisible()
    await expect
      .poll(async () => (await hiddenCounterTitle.textContent()) || '')
      .toMatch(/hidden|·\s*\d+h/)
    await page.mouse.move(1, 1)
    await page.waitForTimeout(150)
    const hiddenCounterShot = await hiddenCounterTitle.screenshot()
    expect(hiddenCounterShot).toMatchSnapshot(
      'window-title-hidden-counter.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )

    await hiddenCounterTitle.hover()
    await expect(hideToggle).toBeVisible()
    await hideToggle.click()
    await page.waitForTimeout(400)
    const hiddenWindowCard = page.locator(WINDOW_CARD_QUERY).first()
    const hiddenWindowShot = await hiddenWindowCard.screenshot()
    expect(hiddenWindowShot).toMatchSnapshot('window-card-hidden-state.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
  })

  test('render toolbar state variants', async () => {
    await page.evaluate(async () => {
      await chrome.storage.sync.set({
        toolbarAutoHide: true,
      })
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(500)

    const toolbar = page.locator('.toolbar').first()
    await expect(toolbar).toBeVisible()
    const indicatorOnlyShot = await toolbar.screenshot()
    expect(indicatorOnlyShot).toMatchSnapshot(
      'toolbar-indicator-only-state.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )

    const toggleToolbarButton = page
      .locator('button[aria-label="Toggle toolbar"]')
      .first()
    await expect(toggleToolbarButton).toBeVisible()
    await toggleToolbarButton.click()
    await toolbar.hover()
    await page.waitForTimeout(400)
    const cleanDuplicatedButton = page
      .locator('button[aria-label^="Clean "][aria-label*="duplicate"]')
      .first()
    await expect(cleanDuplicatedButton).toBeVisible()
    await expect(cleanDuplicatedButton).toBeDisabled()
    const disabledCleanShot = await cleanDuplicatedButton.screenshot()
    expect(disabledCleanShot).toMatchSnapshot(
      'toolbar-clean-duplicated-disabled-state.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
  })

  test('render settings state variants', async () => {
    const settingsButton = page.locator('button[aria-label="Settings"]').first()
    await expect(settingsButton).toBeVisible()
    await settingsButton.click()
    await page.waitForSelector('[aria-label="Update Font Size"]')

    const toolbarToggle = page
      .locator('[aria-labelledby="toggle-always-show-toolbar"]')
      .first()
    await expect(toolbarToggle).toBeVisible()
    const toggleBefore = await toolbarToggle.screenshot()
    expect(toggleBefore).toMatchSnapshot('settings-toggle-before.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    await toolbarToggle.click()
    await page.waitForTimeout(300)
    const toggleAfter = await toolbarToggle.screenshot()
    expect(toggleAfter).toMatchSnapshot('settings-toggle-after.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    const themeToggleGroup = page.getByTestId('settings-theme-toggle-group')
    await expect(themeToggleGroup).toBeVisible()
    const themeToggleShot = await themeToggleGroup.screenshot({
      animations: 'disabled',
    })
    expect(themeToggleShot).toMatchSnapshot('settings-theme-toggle-group.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    const lightThemeButton = themeToggleGroup.getByRole('radio', {
      name: 'Use light theme',
    })
    await lightThemeButton.click()
    await page.waitForTimeout(300)
    await expect(lightThemeButton).toHaveAttribute('aria-checked', 'true')
    const systemThemeButton = themeToggleGroup.getByRole('radio', {
      name: 'Use system theme',
    })
    await systemThemeButton.click()
    await page.waitForTimeout(300)
    await expect(systemThemeButton).toHaveAttribute('aria-checked', 'true')

    const fontSizeControl = page.getByTestId('settings-font-size-control')
    const fontSizeInput = page.locator('[aria-label="Font Size Value"]').first()
    await expect(fontSizeControl).toBeVisible()
    await fontSizeInput.fill('6')
    await page.waitForTimeout(300)
    const fontControlMinShot = await fontSizeControl.screenshot()
    expect(fontControlMinShot).toMatchSnapshot(
      'settings-font-control-min.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
    await fontSizeInput.fill('36')
    await page.waitForTimeout(300)
    const fontControlMaxShot = await fontSizeControl.screenshot()
    expect(fontControlMaxShot).toMatchSnapshot(
      'settings-font-control-max.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
  })

  test('render light and dark theme parity snapshots', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, ['data:text/html,theme-parity-row'])
    await page.bringToFront()
    await page.waitForTimeout(700)

    const tabId = await page.evaluate(async () => {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const tab = tabs.find((item) =>
        (item.url || '').includes('theme-parity-row'),
      )
      return tab?.id ?? -1
    })
    expect(tabId).toBeGreaterThan(0)
    await page.reload()
    await waitForTestId(page, `tab-row-${tabId}`)

    const row = page.getByTestId(`tab-row-${tabId}`)
    const toolbar = page.locator('.toolbar').first()
    const rowLight = await row.screenshot()
    expect(rowLight).toMatchSnapshot('theme-parity-row-light.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    const toolbarLight = await toolbar.screenshot()
    expect(toolbarLight).toMatchSnapshot('theme-parity-toolbar-light.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    const toggleThemeButton = page
      .locator('[aria-label="Toggle light/dark theme"]')
      .first()
    await toggleThemeButton.click()
    await page.waitForTimeout(600)

    const rowDark = await row.screenshot()
    expect(rowDark).toMatchSnapshot('theme-parity-row-dark.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    const toolbarDark = await toolbar.screenshot()
    expect(toolbarDark).toMatchSnapshot('theme-parity-toolbar-dark.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
  })

  test('render loading spinner and typing summary states', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,loading-1',
      'data:text/html,loading-2',
      'data:text/html,loading-3',
      'data:text/html,loading-4',
      'data:text/html,loading-5',
    ])
    await page.bringToFront()
    await page.waitForTimeout(700)

    const searchInput = page.locator(
      'input[placeholder*="Search tabs or URLs"]',
    )
    await searchInput.click()
    await searchInput.fill('typing-state')
    const summary = page.locator('p.fixed.top-0').first()
    await expect(summary).toHaveClass(/opacity-50/)
    const typingSummaryShot = await summary.screenshot()
    expect(typingSummaryShot).toMatchSnapshot('summary-typing-state.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    const syncButton = page.getByTestId('sync-all-windows').first()
    await expect(syncButton).toBeVisible()
    await syncButton.click()
    await page.waitForTimeout(250)
    await page.mouse.move(1, 1)
    await page.waitForTimeout(100)
    const loadingTriggerShot = await syncButton.screenshot()
    expect(loadingTriggerShot).toMatchSnapshot(
      'loading-sync-trigger-state.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
  })

  test('show correct color for selected tabs', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(1000)

    await page.reload()
    const selectAllButton = await page.$('[aria-label="Select all tabs"]')
    await selectAllButton.click()
    await page.waitForTimeout(1000)
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot('correct color.png', snapShotOptions)
  })
})
