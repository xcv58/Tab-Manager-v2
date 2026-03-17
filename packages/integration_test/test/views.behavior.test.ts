import { Page, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  TAB_QUERY,
  WINDOW_CARD_QUERY,
  URLS,
  StandardFixtureUrls,
  IntegrationFixtureServer,
  buildStandardFixtureUrls,
  CLOSE_PAGES,
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
  openPages,
  groupTabsByUrl,
  waitForDefaultExtensionView,
  waitForLocatorRectToStabilize,
  waitForTestId,
  startIntegrationFixtureServer,
} from '../util'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string
let fixtureServer: IntegrationFixtureServer
let fixtureUrls: StandardFixtureUrls

const snapShotOptions = { maxDiffPixelRatio: 0.18, threshold: 0.2 }

test.describe('The Extension page should', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(60000)
  test.beforeAll(async () => {
    fixtureServer = await startIntegrationFixtureServer()
    fixtureUrls = buildStandardFixtureUrls(fixtureServer.baseUrl)
    const init = await initBrowserWithExtension()
    browserContext = init.browserContext
    extensionURL = init.extensionURL
    page = init.page
  })

  test.afterAll(async () => {
    await browserContext?.close()
    await fixtureServer?.close()
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

  test('render search history and no-results states', async () => {
    await openPages(browserContext, [
      'https://pinboard.in/',
      'https://nextjs.org/',
      'https://duckduckgo.com/',
    ])
    await CLOSE_PAGES(browserContext)
    await page.bringToFront()
    await page.reload()
    await page.waitForTimeout(700)

    const searchInput = page.locator(
      'input[placeholder*="Search tabs or URLs"]',
    )
    await expect(searchInput).toBeVisible()
    await searchInput.fill('pinboard')
    await page.waitForTimeout(700)
    const historyDivider = page
      .locator('.MuiAutocomplete-option')
      .filter({ hasText: 'History' })
      .first()
    await expect(historyDivider).toBeVisible()
    const historyList = page.locator('.MuiAutocomplete-listbox').first()
    const historyListShot = await historyList.screenshot()
    expect(historyListShot).toMatchSnapshot('search-history-list-medium.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    await searchInput.fill('zzzz-no-results-state')
    await page.waitForTimeout(500)
    await expect(page.locator('.MuiAutocomplete-option')).toHaveCount(0)
    const noResultsInputShot = await searchInput.screenshot()
    expect(noResultsInputShot).toMatchSnapshot(
      'search-no-results-input-state.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
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
    const lightThemeButton = themeToggleGroup.getByRole('button', {
      name: 'Use light theme',
    })
    await lightThemeButton.click()
    await page.waitForTimeout(300)
    await expect(lightThemeButton).toHaveAttribute('aria-pressed', 'true')
    const systemThemeButton = themeToggleGroup.getByRole('button', {
      name: 'Use system theme',
    })
    await systemThemeButton.click()
    await page.waitForTimeout(300)
    await expect(systemThemeButton).toHaveAttribute('aria-pressed', 'true')

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

    const syncButton = page.locator('[aria-label="Sync All Windows"]').first()
    await expect(syncButton).toBeVisible()
    await syncButton.click()
    await page.waitForTimeout(250)
    const loadingTriggerShot = await syncButton.screenshot()
    expect(loadingTriggerShot).toMatchSnapshot(
      'loading-sync-trigger-state.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
  })

  test('search by group title should reveal tabs from a collapsed group', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(700)
    await openPages(browserContext, fixtureUrls.all)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const groupId = await groupTabsByUrl(page, {
      urls: [fixtureUrls.pinboard, fixtureUrls.nextjs],
      title: 'SearchDocs',
      color: 'blue',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(800)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    const groupedTabIds = await page.evaluate(async (id) => {
      const tabs = await chrome.tabs.query({ currentWindow: true, groupId: id })
      return tabs.map((tab) => tab.id)
    }, groupId)
    expect(groupedTabIds).toHaveLength(2)

    await page.getByTestId(`tab-group-toggle-${groupId}`).click()
    await page.waitForTimeout(500)
    for (const tabId of groupedTabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(0)
    }

    const inputSelector = 'input[placeholder*="Search tabs or URLs"]'
    await page.fill(inputSelector, 'SearchDocs')
    await page.waitForTimeout(600)
    await expect(page.getByTestId(`tab-group-header-${groupId}`)).toHaveCount(1)
    for (const tabId of groupedTabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(1)
    }
  })

  test('show grouped search context even when the query matches only the tab title', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(700)

    const alphaUrl =
      'data:text/html,<title>Alpha%20Guide</title>alpha-group-search'
    const betaUrl =
      'data:text/html,<title>Beta%20Guide</title>beta-group-search'
    await openPages(browserContext, [alphaUrl, betaUrl])
    await page.bringToFront()
    await page.waitForTimeout(800)

    const groupId = await groupTabsByUrl(page, {
      urls: [alphaUrl, betaUrl],
      title: 'SearchDocs',
      color: 'blue',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(800)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    const searchInput = page.locator(
      'input[placeholder*="Search tabs or URLs"]',
    )
    await expect(searchInput).toBeVisible()

    await searchInput.fill('SearchDocs')
    await page.waitForTimeout(700)
    const groupedHeader = page.getByTestId(`search-group-header-${groupId}`)
    await expect(groupedHeader).toBeVisible()
    await expect(groupedHeader).toContainText('SearchDocs')
    const groupMatchedOption = page
      .locator('.MuiAutocomplete-option')
      .filter({ hasText: 'Alpha Guide' })
      .first()
    await expect(groupMatchedOption).not.toContainText('SearchDocs')

    await searchInput.fill('Alpha Guide')
    await page.waitForTimeout(700)
    await expect(groupedHeader).toBeVisible()
    const titleMatchedOption = page
      .locator('.MuiAutocomplete-option')
      .filter({ hasText: 'Alpha Guide' })
      .first()
    await expect(titleMatchedOption).not.toContainText('SearchDocs')
    await titleMatchedOption.hover()
    await expect(page.getByRole('tooltip')).toContainText('Group: SearchDocs')

    await page.evaluate(async () => {
      await chrome.storage.sync.set({
        showUrl: false,
      })
    })
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    const searchInputWithoutUrl = page.locator(
      'input[placeholder*="Search tabs or URLs"]',
    )
    await expect(searchInputWithoutUrl).toBeVisible()
    await searchInputWithoutUrl.fill('Alpha Guide')
    await page.waitForTimeout(700)
    await expect(
      page.getByTestId(`search-group-header-${groupId}`),
    ).toBeVisible()
    const titleMatchedWithoutUrl = page
      .locator('.MuiAutocomplete-option')
      .filter({ hasText: 'Alpha Guide' })
      .first()
    await expect(titleMatchedWithoutUrl).not.toContainText('SearchDocs')
  })

  test('use natural tab order and grouped sections when the search box is empty', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(700)

    const zuluUrl = 'data:text/html,<title>Zulu%20Guide</title>zulu-empty-order'
    const alphaUrl =
      'data:text/html,<title>Alpha%20Guide</title>alpha-empty-order'
    const betaUrl = 'data:text/html,<title>Beta%20Guide</title>beta-empty-order'
    await openPages(browserContext, [zuluUrl, alphaUrl, betaUrl])
    await page.bringToFront()
    await page.waitForTimeout(800)

    const primaryGroupId = await groupTabsByUrl(page, {
      urls: [zuluUrl, alphaUrl],
      title: 'BrowseDocs',
      color: 'blue',
    })
    expect(primaryGroupId).toBeGreaterThan(-1)

    const singleHitGroupId = await groupTabsByUrl(page, {
      urls: [betaUrl],
      title: 'SoloBrowse',
      color: 'green',
    })
    expect(singleHitGroupId).toBeGreaterThan(-1)

    await page.waitForTimeout(800)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${primaryGroupId}`)

    const searchInput = page.locator(
      'input[placeholder*="Search tabs or URLs"]',
    )
    await expect(searchInput).toBeVisible()
    await searchInput.click()
    await page.waitForTimeout(500)

    await expect(
      page.getByTestId(`search-group-header-${primaryGroupId}`),
    ).toBeVisible()
    await expect(
      page.getByTestId(`search-group-header-${singleHitGroupId}`),
    ).toBeVisible()

    await expect
      .poll(async () => {
        const activeDescendant = await searchInput.getAttribute(
          'aria-activedescendant',
        )
        return activeDescendant
          ? (
              await page.locator(`[id="${activeDescendant}"]`).textContent()
            )?.replace(/\s+/g, ' ')
          : null
      })
      .toContain('Tab Manager v2')

    await searchInput.press('ArrowDown')
    await expect
      .poll(async () => {
        const activeDescendant = await searchInput.getAttribute(
          'aria-activedescendant',
        )
        return activeDescendant
          ? (
              await page.locator(`[id="${activeDescendant}"]`).textContent()
            )?.replace(/\s+/g, ' ')
          : null
      })
      .toContain('Zulu Guide')

    await searchInput.press('ArrowDown')
    await expect
      .poll(async () => {
        const activeDescendant = await searchInput.getAttribute(
          'aria-activedescendant',
        )
        return activeDescendant
          ? (
              await page.locator(`[id="${activeDescendant}"]`).textContent()
            )?.replace(/\s+/g, ' ')
          : null
      })
      .toContain('Alpha Guide')

    await searchInput.press('ArrowDown')
    await expect
      .poll(async () => {
        const activeDescendant = await searchInput.getAttribute(
          'aria-activedescendant',
        )
        return activeDescendant
          ? (
              await page.locator(`[id="${activeDescendant}"]`).textContent()
            )?.replace(/\s+/g, ' ')
          : null
      })
      .toContain('Beta Guide')
  })

  test('always group grouped search results without blocking tab selection', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(700)

    const alphaUrl =
      'data:text/html,<title>Alpha%20Guide</title>alpha-soft-group'
    const betaUrl = 'data:text/html,<title>Beta%20Guide</title>beta-soft-group'
    const soloUrl =
      'data:text/html,<title>Gamma%20Guide</title>gamma-soft-group'
    await openPages(browserContext, [alphaUrl, betaUrl, soloUrl])
    await page.bringToFront()
    await page.waitForTimeout(800)

    const clusteredGroupId = await groupTabsByUrl(page, {
      urls: [alphaUrl, betaUrl],
      title: 'SearchDocs',
      color: 'blue',
    })
    expect(clusteredGroupId).toBeGreaterThan(-1)

    const singleHitGroupId = await groupTabsByUrl(page, {
      urls: [soloUrl],
      title: 'SoloDocs',
      color: 'green',
    })
    expect(singleHitGroupId).toBeGreaterThan(-1)

    await page.waitForTimeout(800)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${clusteredGroupId}`)

    const clusteredTabIds = await page.evaluate(async (groupId) => {
      const tabs = await chrome.tabs.query({ currentWindow: true, groupId })
      return tabs.map((tab) => tab.id)
    }, clusteredGroupId)
    expect(clusteredTabIds).toHaveLength(2)

    const singleHitTabIds = await page.evaluate(async (groupId) => {
      const tabs = await chrome.tabs.query({ currentWindow: true, groupId })
      return tabs.map((tab) => tab.id)
    }, singleHitGroupId)
    expect(singleHitTabIds).toHaveLength(1)

    const searchInput = page.locator(
      'input[placeholder*="Search tabs or URLs"]',
    )
    await expect(searchInput).toBeVisible()
    await searchInput.fill('Guide')
    await page.waitForTimeout(700)

    const clusteredHeader = page.getByTestId(
      `search-group-header-${clusteredGroupId}`,
    )
    await expect(clusteredHeader).toBeVisible()
    await expect(clusteredHeader).toContainText('SearchDocs')
    await expect(clusteredHeader).toContainText('2 tabs')
    const clusteredHeaderChip = page.getByTestId(
      `search-group-header-chip-${clusteredGroupId}`,
    )
    await expect(clusteredHeaderChip).toContainText('SearchDocs')
    await expect
      .poll(() =>
        clusteredHeaderChip.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        ),
      )
      .toBe('rgb(26, 115, 232)')
    await expect
      .poll(() =>
        clusteredHeader.evaluate(
          (element) => getComputedStyle(element.closest('li')!).opacity,
        ),
      )
      .toBe('1')
    const singleHitHeader = page.getByTestId(
      `search-group-header-${singleHitGroupId}`,
    )
    await expect(singleHitHeader).toBeVisible()
    await expect(singleHitHeader).toContainText('SoloDocs')
    await expect(singleHitHeader).toContainText('1 tab')

    const optionTexts = await page
      .locator('.MuiAutocomplete-option')
      .allTextContents()
    expect(optionTexts[0]).toContain('SearchDocs')
    expect(optionTexts[1]).toContain('Alpha Guide')
    expect(optionTexts[2]).toContain('Beta Guide')
    expect(optionTexts[3]).toContain('SoloDocs')
    expect(optionTexts[4]).toContain('Gamma Guide')
    for (const tabId of clusteredTabIds) {
      await expect(
        page.getByTestId(`search-tab-group-chip-${tabId}`),
      ).toHaveCount(0)
    }
    await expect(
      page.getByTestId(`search-tab-group-chip-${singleHitTabIds[0]}`),
    ).toHaveCount(0)

    const groupedRow = page
      .locator('.MuiAutocomplete-option')
      .filter({ hasText: 'Alpha Guide' })
      .first()
    await groupedRow.hover()
    await expect(page.getByRole('tooltip')).toContainText('Group: SearchDocs')

    await expect
      .poll(async () => {
        const activeDescendant = await searchInput.getAttribute(
          'aria-activedescendant',
        )
        return activeDescendant
          ? (
              await page.locator(`[id="${activeDescendant}"]`).textContent()
            )?.replace(/\s+/g, ' ')
          : null
      })
      .toContain('Alpha Guide')
  })

  test('remove one tab from a group without breaking remaining grouped tabs', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(700)
    await openPages(browserContext, fixtureUrls.all)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const groupId = await groupTabsByUrl(page, {
      urls: [fixtureUrls.pinboard, fixtureUrls.nextjs],
      title: 'Detach One',
      color: 'cyan',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(700)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    const groupedTabIds = await page.evaluate(async (id) => {
      const tabs = await chrome.tabs.query({ currentWindow: true, groupId: id })
      return tabs.map((tab) => tab.id)
    }, groupId)
    expect(groupedTabIds).toHaveLength(2)
    const [tabToDetachId, remainingTabId] = groupedTabIds

    await page.getByTestId(`tab-row-${tabToDetachId}`).hover()
    await page.getByTestId(`tab-menu-${tabToDetachId}`).click()
    await page
      .getByTestId(
        `tab-menu-option-${tabToDetachId}-remove-this-tab-from-group`,
      )
      .click()
    await page.waitForTimeout(600)

    const state = await page.evaluate(
      async ({ tabToDetachId, remainingTabId, groupId }) => {
        const [detachedTab, remainingTab] = await Promise.all([
          chrome.tabs.get(tabToDetachId),
          chrome.tabs.get(remainingTabId),
        ])
        const noGroupId = chrome.tabGroups.TAB_GROUP_ID_NONE
        const groupedTabs = await chrome.tabs.query({
          currentWindow: true,
          groupId,
        })
        return {
          detachedGroupId: detachedTab.groupId,
          remainingGroupId: remainingTab.groupId,
          noGroupId,
          groupedCount: groupedTabs.length,
        }
      },
      {
        tabToDetachId,
        remainingTabId,
        groupId,
      },
    )

    expect(state.detachedGroupId).toBe(state.noGroupId)
    expect(state.remainingGroupId).toBe(groupId)
    expect(state.groupedCount).toBe(1)
    await expect(page.getByTestId(`tab-group-header-${groupId}`)).toHaveCount(1)
    await expect(page.getByTestId(`tab-group-count-${groupId}`)).toHaveText('1')
  })

  test('create a new group from selected tabs via keyboard shortcut', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(700)
    await openPages(browserContext, fixtureUrls.all)
    await page.bringToFront()
    await page.waitForTimeout(800)
    await page.keyboard.press('j')
    await page.keyboard.press('x')
    await page.keyboard.press('j')
    await page.keyboard.press('x')
    await page.keyboard.press('Alt+Shift+G')
    await page.waitForTimeout(700)

    const groupedState = await page.evaluate(async () => {
      const noGroupId = chrome.tabGroups.TAB_GROUP_ID_NONE
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const groupCounts = tabs.reduce(
        (acc, tab) => {
          if (tab.groupId === noGroupId) {
            return acc
          }
          acc[tab.groupId] = (acc[tab.groupId] || 0) + 1
          return acc
        },
        {} as { [key: number]: number },
      )
      const groupedEntry = Object.entries(groupCounts).find(
        ([_, count]) => count >= 2,
      )
      return {
        groupedEntry,
      }
    })

    expect(groupedState.groupedEntry).toBeTruthy()
    const [groupId] = groupedState.groupedEntry
    await waitForTestId(page, `tab-group-header-${groupId}`)
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

  test('support search browser history', async () => {
    await expect(page.locator(WINDOW_CARD_QUERY)).toHaveCount(1)
    await expect(page.locator(TAB_QUERY)).toHaveCount(1)
    await page.goto(extensionURL.replace('not_popup=1', ''))

    await openPages(browserContext, URLS)
    await page.waitForTimeout(1000)
    await CLOSE_PAGES(browserContext)
    await page.waitForTimeout(1000)
    await openPages(browserContext, URLS)
    await page.waitForTimeout(1000)
    await CLOSE_PAGES(browserContext)
    await page.waitForTimeout(1000)
    await page.bringToFront()

    const inputSelector = 'input[type="text"]'
    await page.waitForSelector(inputSelector)
    await page.waitForTimeout(1000)
    await page.bringToFront()
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(
      'browser history 1a.png',
      snapShotOptions,
    )

    await page.fill(inputSelector, 'xcv58')
    await page.waitForTimeout(1000)
    await page.bringToFront()
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(
      'browser history 2a.png',
      snapShotOptions,
    )

    await page.fill(inputSelector, 'duck')
    await page.waitForTimeout(1000)
    await page.bringToFront()
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot('browser history 3.png')

    await page.fill(inputSelector, '')
  })

  test('check duplicated tabs and is case insensitive', async () => {
    await openPages(browserContext, URLS)
    await openPages(browserContext, [
      'http://xcv58.com/ABC',
      'http://xcv58.com/abc',
      'http://xcv58.com/aBC',
    ])
    await page.bringToFront()
    await page.waitForTimeout(1000)

    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot('duplicated tabs.png', snapShotOptions)
  })
})
