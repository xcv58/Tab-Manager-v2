import { Page, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  TAB_QUERY,
  WINDOW_CARD_QUERY,
  URLS,
  CLOSE_PAGES,
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
  openPages,
  groupTabsByUrl,
  waitForDefaultExtensionView,
  waitForSurfaceToFullyAppear,
  waitForTestId,
} from '../util'
import manifest from '../../extension/src/manifest.json'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

const snapShotOptions = { maxDiffPixelRatio: 0.18, threshold: 0.2 }

test.describe('The Extension page should', () => {
  test.describe.configure({ mode: 'serial' })
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

  test('have title ends with the extension name', async () => {
    await page.goto(extensionURL)
    await expect(page.title()).resolves.toMatch(manifest.name)
  })

  test('render correct number of windows & tabs', async () => {
    await page.waitForTimeout(1000)
    await page.reload()
    await expect(page.locator(WINDOW_CARD_QUERY)).toHaveCount(1)
    await page.reload()
    await expect(page.locator(TAB_QUERY)).toHaveCount(1)

    let tabs = await page.$$(TAB_QUERY)

    const N = 10

    await openPages(
      browserContext,
      [...Array(N)].map((_) => 'https://ops-class.org/'),
    )
    await page.bringToFront()
    tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(N + 1)
    const pages = await browserContext.pages()
    expect(pages).toHaveLength(N + 1)
    await page.bringToFront()
    await page.reload()
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(
      'render correct number of windows & tabs.png',
      snapShotOptions,
    )
  })

  test('render popup mode based on URL query', async () => {
    await expect(page.locator(WINDOW_CARD_QUERY)).toHaveCount(1)
    await expect(page.locator(TAB_QUERY)).toHaveCount(1)
    await page.goto(extensionURL.replace('not_popup=1', ''))

    await openPages(browserContext, URLS)
    await openPages(
      browserContext,
      [...Array(10)].map((_) => 'https://ops-class.org/'),
    )
    await page.bringToFront()
    await page.reload()
    const inputSelector = 'input[type="text"]'
    await page.waitForSelector(inputSelector)
    await page.waitForTimeout(3000)
    // Wait for the UI to be stable and all tabs (URLS count + 10 ops-classes self) to be rendered
    await expect(page.locator(TAB_QUERY)).toHaveCount(URLS.length + 10 + 1)
    await page.waitForTimeout(3000)
    // Wait for the UI to be stable and all tabs (URLS count + 10 ops-classes self) to be rendered
    // Reload to ensure all tabs are detected
    await page.reload()
    await page.waitForTimeout(3000)
    await page.waitForSelector(inputSelector)
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot('popup 1a.png', snapShotOptions)

    await page.waitForTimeout(1000)
    await page.fill(inputSelector, 'xcv58')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot('popup 2a.png', snapShotOptions)

    await page.fill(inputSelector, '')
  })

  test('render grouped headers and support collapse/rename/color updates', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(700)
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const groupId = await groupTabsByUrl(page, {
      urls: ['https://pinboard.in/', 'https://nextjs.org/'],
      title: 'Docs',
      color: 'green',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(800)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)
    await expect(page.getByTestId(`tab-group-title-${groupId}`)).toHaveText(
      'Docs',
    )
    await expect(page.getByTestId(`tab-group-count-${groupId}`)).toHaveText('2')
    await expect(page.getByTestId(`tab-group-title-${groupId}`)).toHaveCSS(
      'background-color',
      'rgb(24, 128, 56)',
    )
    await expect(page.getByTestId(`tab-group-bar-${groupId}`)).toHaveCSS(
      'background-color',
      'rgb(24, 128, 56)',
    )
    const groupedTabIds = await page.evaluate(async (id) => {
      const tabs = await chrome.tabs.query({ currentWindow: true, groupId: id })
      return tabs.map((tab) => tab.id)
    }, groupId)
    expect(groupedTabIds).toHaveLength(2)
    for (const tabId of groupedTabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(1)
    }

    await page.getByTestId(`tab-group-toggle-${groupId}`).click()
    await page.waitForTimeout(600)
    const collapsed = await page.evaluate(async (id) => {
      const tabGroup = await chrome.tabGroups.get(id)
      return tabGroup.collapsed
    }, groupId)
    expect(collapsed).toBe(true)
    for (const tabId of groupedTabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(0)
    }

    await page.getByTestId(`tab-group-toggle-${groupId}`).click()
    await page.waitForTimeout(400)
    for (const tabId of groupedTabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(1)
    }

    await page.getByTestId(`tab-group-menu-${groupId}`).click()
    await page.getByTestId(`tab-group-menu-rename-${groupId}`).click()
    await waitForTestId(page, `tab-group-editor-${groupId}`)
    await page
      .getByTestId(`tab-group-editor-title-${groupId}`)
      .fill('Renamed Group')
    await page.getByTestId(`tab-group-editor-color-${groupId}-red`).click()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId(`tab-group-editor-${groupId}`)).toHaveCount(0)

    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)
    await expect(page.getByTestId(`tab-group-title-${groupId}`)).toHaveText(
      'Renamed Group',
    )
    await expect(page.getByTestId(`tab-group-title-${groupId}`)).toHaveCSS(
      'background-color',
      'rgb(217, 48, 37)',
    )
    await expect(
      page.getByTestId(`tab-row-${groupedTabIds[0]}`).locator('hr'),
    ).toHaveCSS('border-top-color', 'rgb(217, 48, 37)')
  })

  test('render group title chip with chrome-like proportions', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(700)
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const groupId = await groupTabsByUrl(page, {
      urls: ['https://pinboard.in/', 'https://nextjs.org/'],
      title: 'Uage',
      color: 'red',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(800)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    const chip = page.getByTestId(`tab-group-title-${groupId}`)
    await expect(chip).toHaveText('Uage')
    const chipMetrics = await chip.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return {
        height: Number.parseFloat(style.height),
        paddingLeft: Number.parseFloat(style.paddingLeft),
        paddingRight: Number.parseFloat(style.paddingRight),
        borderRadius: Number.parseFloat(style.borderRadius),
      }
    })
    expect(chipMetrics.height).toBeGreaterThanOrEqual(20)
    expect(chipMetrics.height).toBeLessThanOrEqual(24.5)
    expect(chipMetrics.paddingLeft).toBeGreaterThanOrEqual(10)
    expect(chipMetrics.paddingLeft).toBeLessThanOrEqual(12.5)
    expect(chipMetrics.paddingRight).toBeGreaterThanOrEqual(10)
    expect(chipMetrics.paddingRight).toBeLessThanOrEqual(12.5)
    expect(chipMetrics.borderRadius).toBeGreaterThanOrEqual(8)
    expect(chipMetrics.borderRadius).toBeLessThanOrEqual(10)
  })

  test('render group count label as compact element', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(700)
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const groupId = await groupTabsByUrl(page, {
      urls: ['https://pinboard.in/', 'https://nextjs.org/'],
      title: 'Count',
      color: 'green',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(800)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    const count = page.getByTestId(`tab-group-count-${groupId}`)
    await expect(count).toHaveText('2')
    const countMetrics = await count.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return {
        fontSize: Number.parseFloat(style.fontSize),
        lineHeight: Number.parseFloat(style.lineHeight),
      }
    })
    expect(countMetrics.fontSize).toBeGreaterThanOrEqual(10)
    expect(countMetrics.fontSize).toBeLessThanOrEqual(13)
    expect(countMetrics.lineHeight).toBeGreaterThanOrEqual(14)
    expect(countMetrics.lineHeight).toBeLessThanOrEqual(16)

    const countBox = await count.boundingBox()
    expect(countBox).not.toBeNull()
    if (countBox) {
      expect(countBox.width).toBeGreaterThanOrEqual(6)
      expect(countBox.width).toBeLessThanOrEqual(10)
      expect(countBox.height).toBeGreaterThanOrEqual(14)
      expect(countBox.height).toBeLessThanOrEqual(17)
    }
  })

  test('render group drag handle icon on header hover', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(700)
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const groupId = await groupTabsByUrl(page, {
      urls: ['https://pinboard.in/', 'https://nextjs.org/'],
      title: 'Drag',
      color: 'cyan',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(800)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    await page.getByTestId(`tab-group-header-${groupId}`).hover()
    await page.waitForTimeout(200)
    const handle = page.getByTestId(`tab-group-drag-handle-${groupId}`)
    await expect(handle).toBeVisible()
    const handleScreenshot = await handle.screenshot()
    expect(handleScreenshot).toMatchSnapshot('group-drag-handle-hover.png', {
      maxDiffPixelRatio: 0.08,
      threshold: 0.2,
    })
  })

  test('render group editor input and color palette', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(700)
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const groupId = await groupTabsByUrl(page, {
      urls: ['https://pinboard.in/', 'https://nextjs.org/'],
      title: 'Editor',
      color: 'pink',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(800)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    await page.getByTestId(`tab-group-menu-${groupId}`).click()
    await page.getByTestId(`tab-group-menu-rename-${groupId}`).click()
    await waitForTestId(page, `tab-group-editor-${groupId}`)
    const groupEditor = page.getByTestId(`tab-group-editor-${groupId}`)
    await waitForSurfaceToFullyAppear(page, groupEditor)

    const titleInput = page.getByTestId(`tab-group-editor-title-${groupId}`)
    const titleInputScreenshot = await titleInput.screenshot({
      animations: 'disabled',
    })
    expect(titleInputScreenshot).toMatchSnapshot(
      'group-editor-title-input.png',
      {
        maxDiffPixelRatio: 0.08,
        threshold: 0.2,
      },
    )

    const colors = page.getByTestId(`tab-group-editor-colors-${groupId}`)
    const colorsScreenshot = await colors.screenshot({ animations: 'disabled' })
    expect(colorsScreenshot).toMatchSnapshot('group-editor-color-palette.png', {
      maxDiffPixelRatio: 0.08,
      threshold: 0.2,
    })
  })

  test('render search input atom', async () => {
    const searchInput = page.locator(
      'input[placeholder*="Search your tab title or URL"]',
    )
    await expect(searchInput).toBeVisible()
    await page.mouse.click(12, 120)
    const searchInputScreenshot = await searchInput.screenshot()
    expect(searchInputScreenshot).toMatchSnapshot('search-input-atom.png', {
      maxDiffPixelRatio: 0.08,
      threshold: 0.2,
    })
  })

  test('render command suggestion atom', async () => {
    const searchInput = page.locator(
      'input[placeholder*="Search your tab title or URL"]',
    )
    await expect(searchInput).toBeVisible()
    await searchInput.click()
    await searchInput.fill('>sort')
    const firstOption = page.locator('.MuiAutocomplete-option').first()
    await waitForSurfaceToFullyAppear(page, firstOption)
    const commandOptionScreenshot = await firstOption.screenshot({
      animations: 'disabled',
    })
    expect(commandOptionScreenshot).toMatchSnapshot(
      'command-suggestion-option-atom.png',
      {
        maxDiffPixelRatio: 0.08,
        threshold: 0.2,
      },
    )
  })

  test('render toolbar action icon atoms', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(700)
    await page.reload()

    const settingsButton = page.locator('button[aria-label="Settings"]').first()
    await expect(settingsButton).toBeVisible()
    const settingsButtonScreenshot = await settingsButton.screenshot()
    expect(settingsButtonScreenshot).toMatchSnapshot(
      'toolbar-button-settings-atom.png',
      {
        maxDiffPixelRatio: 0.08,
        threshold: 0.2,
      },
    )

    const shortcutButton = page
      .locator('button[aria-label="Show shortcut hints"]')
      .first()
    await expect(shortcutButton).toBeVisible()
    const shortcutButtonScreenshot = await shortcutButton.screenshot()
    expect(shortcutButtonScreenshot).toMatchSnapshot(
      'toolbar-button-shortcuts-atom.png',
      {
        maxDiffPixelRatio: 0.08,
        threshold: 0.2,
      },
    )

    const clusterButton = page
      .locator('button[aria-label="Cluster Ungrouped & Sort Tabs"]')
      .first()
    await expect(clusterButton).toBeVisible()
    const clusterButtonScreenshot = await clusterButton.screenshot()
    expect(clusterButtonScreenshot).toMatchSnapshot(
      'toolbar-button-cluster-atom.png',
      {
        maxDiffPixelRatio: 0.08,
        threshold: 0.2,
      },
    )

    const cleanDuplicatedButton = page
      .locator('button[aria-label="Clean duplicated tabs"]')
      .first()
    await expect(cleanDuplicatedButton).toBeVisible()
    const cleanDuplicatedScreenshot = await cleanDuplicatedButton.screenshot()
    expect(cleanDuplicatedScreenshot).toMatchSnapshot(
      'toolbar-button-clean-duplicated-atom.png',
      {
        maxDiffPixelRatio: 0.08,
        threshold: 0.2,
      },
    )

    const themeToggleButton = page
      .locator('[aria-label="Toggle light/dark theme"]')
      .first()
    await expect(themeToggleButton).toBeVisible()
    const themeToggleScreenshot = await themeToggleButton.screenshot()
    expect(themeToggleScreenshot).toMatchSnapshot(
      'toolbar-button-theme-toggle-atom.png',
      {
        maxDiffPixelRatio: 0.08,
        threshold: 0.2,
      },
    )
  })

  test('render window control icon atoms', async () => {
    await openPages(browserContext, ['data:text/html,window-controls-atom'])
    await page.bringToFront()
    await page.waitForTimeout(700)
    await page.reload()

    const windowTitle = page.locator('[data-testid^="window-title-"]').first()
    await expect(windowTitle).toBeVisible()
    const sortButton = page.locator('button[aria-label="Sort tabs"]').first()
    await expect(sortButton).toBeHidden()
    await windowTitle.focus()
    await page.waitForTimeout(150)
    await expect(sortButton).toBeVisible()
    const sortButtonScreenshot = await sortButton.screenshot()
    expect(sortButtonScreenshot).toMatchSnapshot(
      'window-sort-button-atom.png',
      {
        maxDiffPixelRatio: 0.08,
        threshold: 0.2,
      },
    )

    const reloadButton = page
      .locator('button[aria-label="Reload all tabs"]')
      .first()
    await expect(reloadButton).toBeVisible()
    const reloadButtonScreenshot = await reloadButton.screenshot()
    expect(reloadButtonScreenshot).toMatchSnapshot(
      'window-reload-button-atom.png',
      {
        maxDiffPixelRatio: 0.08,
        threshold: 0.2,
      },
    )
  })

  test('render settings control atoms', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        tabWidth: 20,
        fontSize: 14,
        toolbarAutoHide: false,
        useSystemTheme: true,
        darkTheme: false,
      })
    })
    await page.reload()

    const settingsButton = page.locator('button[aria-label="Settings"]').first()
    await expect(settingsButton).toBeVisible()
    await settingsButton.click()
    await page.waitForSelector('[aria-label="Update Font Size"]')

    const tabWidthSlider = page
      .locator('[aria-label="Update Tab Width"]')
      .first()
    await expect(tabWidthSlider).toBeVisible()
    await expect(tabWidthSlider).toHaveAttribute('aria-valuemin', '15')
    await expect(tabWidthSlider).toHaveAttribute('aria-valuemax', '50')
    await expect(tabWidthSlider).toHaveAttribute('aria-valuenow', '20')

    const fontSizeSlider = page
      .locator('[aria-label="Update Font Size"]')
      .first()
    await expect(fontSizeSlider).toBeVisible()
    await expect(fontSizeSlider).toHaveAttribute('aria-valuemin', '6')
    await expect(fontSizeSlider).toHaveAttribute('aria-valuemax', '36')
    await expect(fontSizeSlider).toHaveAttribute('aria-valuenow', '14')

    const toolbarToggle = page
      .locator('[aria-labelledby="toggle-always-show-toolbar"]')
      .first()
    await expect(toolbarToggle).toBeVisible()
    const toolbarToggleScreenshot = await toolbarToggle.screenshot()
    expect(toolbarToggleScreenshot).toMatchSnapshot(
      'settings-toolbar-toggle-atom.png',
      {
        maxDiffPixelRatio: 0.08,
        threshold: 0.2,
      },
    )

    const themeSelect = page.locator('#theme-select').first()
    await expect(themeSelect).toBeVisible()
    const themeSelectScreenshot = await themeSelect.screenshot()
    expect(themeSelectScreenshot).toMatchSnapshot(
      'settings-theme-select-atom.png',
      {
        maxDiffPixelRatio: 0.08,
        threshold: 0.2,
      },
    )

    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  })

  test('render tab row action atoms', async () => {
    const atomTabUrl = 'data:text/html,<title>Atom%20Row</title>atom-row'
    await openPages(browserContext, [atomTabUrl])
    await page.bringToFront()
    await page.waitForTimeout(700)

    const atomTabId = await page.evaluate(async (url) => {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const target = tabs.find((tab) => tab.url === url)
      return target?.id ?? -1
    }, atomTabUrl)
    expect(atomTabId).toBeGreaterThan(0)
    await page.reload()
    await waitForTestId(page, `tab-row-${atomTabId}`)

    const row = page.getByTestId(`tab-row-${atomTabId}`)
    await expect(row).toBeVisible()
    await row.hover()
    await page.waitForTimeout(250)
    const rowRect = await row.boundingBox()
    if (rowRect) {
      await page.mouse.move(rowRect.x + 8, rowRect.y + rowRect.height / 2)
      await page.waitForTimeout(120)
    }

    const tabMenuButton = page.getByTestId(`tab-menu-${atomTabId}`)
    await expect(tabMenuButton).toBeVisible()
    const tabMenuButtonScreenshot = await tabMenuButton.screenshot()
    expect(tabMenuButtonScreenshot).toMatchSnapshot(
      'tab-menu-button-atom.png',
      {
        maxDiffPixelRatio: 0.08,
        threshold: 0.2,
      },
    )

    const closeButton = row.getByRole('button', { name: 'Close' }).first()
    await expect(closeButton).toBeVisible()
    const closeButtonScreenshot = await closeButton.screenshot()
    expect(closeButtonScreenshot).toMatchSnapshot('tab-close-button-atom.png', {
      maxDiffPixelRatio: 0.08,
      threshold: 0.2,
    })

    await row.hover()
    await expect(tabMenuButton).toBeVisible()
    await tabMenuButton.click({ force: true })
    await waitForTestId(page, `tab-menu-option-${atomTabId}-close`)
    const tabMenuPanel = page.locator('.MuiPopover-root .MuiPaper-root').last()
    await waitForSurfaceToFullyAppear(page, tabMenuPanel)
    const tabMenuPanelScreenshot = await tabMenuPanel.screenshot({
      animations: 'disabled',
    })
    expect(tabMenuPanelScreenshot).toMatchSnapshot('tab-menu-panel-atom.png', {
      maxDiffPixelRatio: 0.08,
      threshold: 0.2,
    })
  })
})
