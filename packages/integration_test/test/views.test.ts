import { Page, Locator, ChromiumBrowserContext } from 'playwright'
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
  createWindowsWithTabs,
  groupTabsByUrlInWindow,
  waitForDefaultExtensionView,
  waitForSurfaceToFullyAppear,
  waitForTestId,
} from '../util'
import manifest from '../../extension/src/manifest.json'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

const snapShotOptions = { maxDiffPixelRatio: 0.18, threshold: 0.2 }

const screenshotLocatorWithRetry = async (
  page: Page,
  getLocator: () => Locator,
  {
    beforeCapture,
    attempts = 3,
    screenshotOptions,
  }: {
    beforeCapture?: () => Promise<void>
    attempts?: number
    screenshotOptions?: Parameters<Locator['screenshot']>[0]
  } = {},
) => {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (beforeCapture) {
      await beforeCapture()
    }
    const locator = getLocator()
    await expect(locator).toBeVisible()
    try {
      return await locator.screenshot(screenshotOptions)
    } catch (error) {
      lastError = error
      const message = String(error)
      if (
        !message.includes('Element is not attached to the DOM') ||
        attempt === attempts - 1
      ) {
        throw error
      }
      await page.waitForTimeout(100)
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to capture locator screenshot')
}

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
    const expectedTabCount = URLS.length + 10 + 1
    await expect
      .poll(
        async () =>
          await page.evaluate(async () => (await chrome.tabs.query({})).length),
        { timeout: 5000 },
      )
      .toBe(expectedTabCount)
    await page.reload()
    const inputSelector = 'input[type="text"]'
    await page.waitForSelector(inputSelector)
    await expect(page.locator(TAB_QUERY)).toHaveCount(expectedTabCount, {
      timeout: 10000,
    })
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
      await expect(page.getByTestId(`tab-group-indicator-${tabId}`)).toHaveCSS(
        'left',
        '6px',
      )
      await expect(page.getByTestId(`tab-group-indicator-${tabId}`)).toHaveCSS(
        'right',
        '6px',
      )
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

    await page.getByTestId(`tab-group-header-${groupId}`).hover()
    await expect(page.getByTestId(`tab-group-menu-${groupId}`)).toBeVisible()
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
    expect(chipMetrics.paddingLeft).toBeGreaterThanOrEqual(7)
    expect(chipMetrics.paddingLeft).toBeLessThanOrEqual(9.5)
    expect(chipMetrics.paddingRight).toBeGreaterThanOrEqual(7)
    expect(chipMetrics.paddingRight).toBeLessThanOrEqual(9.5)
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

  test('render group drag handle icon on header emphasis', async () => {
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
    await page.getByTestId(`tab-group-toggle-${groupId}`).focus()
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

    await page.getByTestId(`tab-group-header-${groupId}`).hover()
    await expect(page.getByTestId(`tab-group-menu-${groupId}`)).toBeVisible()
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
      'input[placeholder*="Search tabs or URLs"]',
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
      'input[placeholder*="Search tabs or URLs"]',
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
      .locator('button[aria-label^="Clean "][aria-label*="duplicate"]')
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
    const sortButtonSlot = sortButton.locator('xpath=ancestor::div[1]')
    await expect(sortButton).toBeVisible()
    await expect(sortButtonSlot).toHaveCSS('opacity', '1')
    await windowTitle.hover()
    await page.waitForTimeout(150)
    await expect(sortButton).toBeVisible()
    await expect(sortButtonSlot).toHaveCSS('opacity', '1')
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
    await windowTitle.hover()
    await page.waitForTimeout(150)
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
    const getTabMenuButton = () => page.getByTestId(`tab-menu-${atomTabId}`)
    const hoverActionRow = async () => {
      await expect
        .poll(
          async () => {
            await row.hover()
            await page.waitForTimeout(120)
            return await getTabMenuButton().isVisible()
          },
          { timeout: 2000 },
        )
        .toBe(true)
    }

    const tabMenuButtonScreenshot = await screenshotLocatorWithRetry(
      page,
      getTabMenuButton,
      {
        beforeCapture: hoverActionRow,
      },
    )
    expect(tabMenuButtonScreenshot).toMatchSnapshot(
      'tab-menu-button-atom.png',
      {
        maxDiffPixelRatio: 0.08,
        threshold: 0.2,
      },
    )

    const closeButtonScreenshot = await screenshotLocatorWithRetry(
      page,
      () => row.getByRole('button', { name: 'Close' }).first(),
      {
        beforeCapture: hoverActionRow,
      },
    )
    expect(closeButtonScreenshot).toMatchSnapshot('tab-close-button-atom.png', {
      maxDiffPixelRatio: 0.08,
      threshold: 0.2,
    })

    await hoverActionRow()
    const tabMenuButton = getTabMenuButton()
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

  test('keep control icons balanced at large font sizes', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        fontSize: 30,
      })
    })
    const atomTabUrl =
      'data:text/html,<title>Large%20Font%20Row</title>large-font-row'
    await openPages(browserContext, [atomTabUrl])
    await page.bringToFront()
    await page.waitForTimeout(700)

    const atomTab = await page.evaluate(async (url) => {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const target = tabs.find((tab) => tab.url === url)
      return target
        ? {
            id: target.id ?? -1,
            windowId: target.windowId ?? -1,
          }
        : null
    }, atomTabUrl)
    expect(atomTab?.id ?? -1).toBeGreaterThan(0)
    expect(atomTab?.windowId ?? -1).toBeGreaterThan(-1)
    await page.reload()
    await waitForTestId(page, `tab-row-${atomTab!.id}`)
    await waitForTestId(page, `window-title-${atomTab!.windowId}`)

    const row = page.getByTestId(`tab-row-${atomTab!.id}`)
    const windowTitle = page.getByTestId(`window-title-${atomTab!.windowId}`)
    await expect(row).toBeVisible()
    await expect(windowTitle).toBeVisible()
    const tabMenuButton = page.getByTestId(`tab-menu-${atomTab!.id}`)
    const dragHandleButton = row.getByRole('button', { name: 'Drag tab' })
    await expect
      .poll(
        async () => {
          await row.hover()
          await page.waitForTimeout(120)
          return (
            (await tabMenuButton.isVisible()) &&
            (await dragHandleButton.isVisible())
          )
        },
        { timeout: 2000 },
      )
      .toBe(true)

    const rowMetrics = await row.evaluate((rowNode, id) => {
      const measure = (selector: string) => {
        const button = rowNode.querySelector(selector) as HTMLElement | null
        const icon = button?.querySelector('svg') as SVGElement | null
        if (!button || !icon) {
          return null
        }
        const buttonRect = button.getBoundingClientRect()
        const iconRect = icon.getBoundingClientRect()
        return {
          buttonWidth: buttonRect.width,
          buttonHeight: buttonRect.height,
          iconWidth: iconRect.width,
          iconHeight: iconRect.height,
        }
      }

      return {
        menu: measure(`[data-testid="tab-menu-${id}"]`),
        drag: measure('[aria-label="Drag tab"]'),
        favicon: (() => {
          const button = rowNode.querySelector(
            'button[aria-label="Toggle select"]',
          ) as HTMLElement | null
          const icon = button?.querySelector('img') as HTMLImageElement | null
          const rowRect = rowNode.getBoundingClientRect()
          if (!button || !icon) {
            return null
          }
          const buttonRect = button.getBoundingClientRect()
          const iconRect = icon.getBoundingClientRect()
          return {
            buttonWidth: buttonRect.width,
            buttonHeight: buttonRect.height,
            iconWidth: iconRect.width,
            iconHeight: iconRect.height,
            buttonLeft: buttonRect.left - rowRect.left,
            buttonRight: buttonRect.right - rowRect.left,
            iconLeft: iconRect.left - rowRect.left,
            iconRight: iconRect.right - rowRect.left,
          }
        })(),
      }
    }, atomTab!.id)

    const windowMetrics = await windowTitle.evaluate((titleNode) => {
      const checkbox = titleNode.querySelector(
        '.MuiCheckbox-root',
      ) as HTMLElement | null
      const icon = checkbox?.querySelector('svg') as SVGElement | null
      if (!checkbox || !icon) {
        return null
      }
      const checkboxRect = checkbox.getBoundingClientRect()
      const iconRect = icon.getBoundingClientRect()
      return {
        buttonWidth: checkboxRect.width,
        buttonHeight: checkboxRect.height,
        iconWidth: iconRect.width,
        iconHeight: iconRect.height,
      }
    })

    expect(rowMetrics.menu).not.toBeNull()
    expect(rowMetrics.drag).not.toBeNull()
    expect(rowMetrics.favicon).not.toBeNull()
    expect(windowMetrics).not.toBeNull()
    const menuMetrics = rowMetrics.menu!
    const dragMetrics = rowMetrics.drag!
    const faviconMetrics = rowMetrics.favicon!
    const selectAllMetrics = windowMetrics!
    expect(menuMetrics.iconWidth).toBeLessThanOrEqual(menuMetrics.buttonWidth)
    expect(menuMetrics.iconHeight).toBeLessThanOrEqual(menuMetrics.buttonHeight)
    expect(
      Math.abs(menuMetrics.iconHeight - dragMetrics.iconHeight),
    ).toBeLessThanOrEqual(4)
    expect(faviconMetrics.iconWidth).toBeLessThanOrEqual(22)
    expect(faviconMetrics.iconHeight).toBeLessThanOrEqual(22)
    expect(faviconMetrics.buttonWidth).toBeLessThanOrEqual(40)
    expect(faviconMetrics.buttonHeight).toBeLessThanOrEqual(40)
    expect(faviconMetrics.buttonLeft).toBeGreaterThanOrEqual(0)
    expect(faviconMetrics.buttonRight).toBeLessThanOrEqual(40.5)
    expect(faviconMetrics.iconLeft).toBeGreaterThanOrEqual(8)
    expect(faviconMetrics.iconRight).toBeLessThanOrEqual(32)
    expect(selectAllMetrics.iconWidth).toBeLessThanOrEqual(22)
    expect(selectAllMetrics.iconHeight).toBeLessThanOrEqual(22)
    expect(selectAllMetrics.buttonWidth).toBeLessThanOrEqual(40)
    expect(selectAllMetrics.buttonHeight).toBeLessThanOrEqual(40)
  })

  test('align action rails across group and tab rows', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    const [targetWindowId] = await createWindowsWithTabs(page, [
      [
        'data:text/html,action-align-a',
        'data:text/html,action-align-b',
        'data:text/html,action-align-c',
      ],
    ])
    expect(targetWindowId).toBeGreaterThan(-1)
    await page.bringToFront()
    await page.waitForTimeout(900)

    let groupId = -1
    for (let attempt = 0; attempt < 6; attempt += 1) {
      groupId = await groupTabsByUrlInWindow(page, {
        windowId: targetWindowId,
        urls: [
          'data:text/html,action-align-a',
          'data:text/html,action-align-b',
        ],
        title: 'Alignment',
        color: 'blue',
      })
      if (groupId > -1) {
        break
      }
      await page.waitForTimeout(250)
    }
    expect(groupId).toBeGreaterThan(-1)
    const groupedTabHandle = await page.waitForFunction(
      async (currentGroupId) => {
        const tabs = await chrome.tabs.query({})
        const target = tabs.find((tab) => tab.groupId === currentGroupId)
        return target
          ? {
              id: target.id ?? -1,
              windowId: target.windowId ?? -1,
            }
          : null
      },
      groupId,
    )
    const groupedTab = (await groupedTabHandle.jsonValue()) as {
      id: number
      windowId: number
    }
    const groupedTabId = groupedTab.id
    const groupedWindowId = groupedTab.windowId
    expect(groupedTabId).toBeGreaterThan(0)
    expect(groupedWindowId).toBeGreaterThan(-1)

    await page.reload()
    await waitForTestId(page, `window-card-${groupedWindowId}`)
    await waitForTestId(page, `tab-group-header-${groupId}`)
    await waitForTestId(page, `tab-row-${groupedTabId}`)

    const groupHeader = page.getByTestId(`tab-group-header-${groupId}`)
    const tabRow = page.getByTestId(`tab-row-${groupedTabId}`)
    await groupHeader.focus()
    await page.waitForTimeout(150)
    await tabRow.hover()
    await page.waitForTimeout(150)
    const tabRowHandle = await tabRow.elementHandle()
    expect(tabRowHandle).not.toBeNull()
    const railPositions = await groupHeader.evaluate(
      (groupHeaderNode, tabRowNode) => {
        const readLeft = (node: Element | null) =>
          (node as HTMLElement | null)?.getBoundingClientRect().left ?? -1

        return {
          groupMenu: readLeft(
            groupHeaderNode?.querySelector(
              '[data-testid^="tab-group-menu-"]',
            ) || null,
          ),
          groupClose: readLeft(
            groupHeaderNode?.querySelector(
              'button[aria-label="Close group"]',
            ) || null,
          ),
          tabMenu: readLeft(
            tabRowNode?.querySelector('[data-testid^="tab-menu-"]') || null,
          ),
          tabClose: readLeft(
            tabRowNode?.querySelector('button[aria-label="Close"]') || null,
          ),
        }
      },
      tabRowHandle,
    )

    expect(railPositions.groupMenu).toBeGreaterThan(0)
    expect(railPositions.groupClose).toBeGreaterThan(0)
    expect(railPositions.tabMenu).toBeGreaterThan(0)
    expect(railPositions.tabClose).toBeGreaterThan(0)

    expect(
      Math.abs(railPositions.groupMenu - railPositions.tabMenu),
    ).toBeLessThan(1.5)
    expect(
      Math.abs(railPositions.groupClose - railPositions.tabClose),
    ).toBeLessThan(1.5)
  })
})
