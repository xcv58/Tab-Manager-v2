import { Page, Locator, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  TAB_QUERY,
  WINDOW_CARD_QUERY,
  URLS,
  CLOSE_PAGES,
  initBrowserWithExtension,
  openPages,
  groupTabsByUrl,
  waitForTestId,
} from '../util'
import manifest from '../../extension/src/manifest.json'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

const snapShotOptions = { maxDiffPixelRatio: 0.18, threshold: 0.2 }

const waitForAnimationsToFinish = async (target: Locator): Promise<void> => {
  await target.evaluate(async (node) => {
    const nextFrame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    let stableFrames = 0
    for (let i = 0; i < 180; i += 1) {
      const animations = node
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation.playState !== 'finished' &&
            animation.playState !== 'idle',
        )
      if (animations.length > 0) {
        stableFrames = 0
        await Promise.all(
          animations.map((animation) =>
            animation.finished.catch(() => undefined),
          ),
        )
      } else {
        stableFrames += 1
      }
      if (stableFrames >= 3) {
        return
      }
      await nextFrame()
    }
  })
}

const waitForSurfaceToFullyAppear = async (
  page: Page,
  surface: Locator,
): Promise<void> => {
  await expect(surface).toBeVisible()
  await waitForAnimationsToFinish(surface)
  await expect
    .poll(
      async () =>
        surface.evaluate((node) => {
          const isIdentityTransform = (transform: string): boolean => {
            if (transform === 'none') {
              return true
            }
            const matrix2d = /^matrix\(([^)]+)\)$/.exec(transform)
            if (matrix2d) {
              const values = matrix2d[1]
                .split(',')
                .map((value) => Number(value.trim()))
              if (values.length !== 6) {
                return false
              }
              return (
                Math.abs(values[0] - 1) < 0.001 &&
                Math.abs(values[1]) < 0.001 &&
                Math.abs(values[2]) < 0.001 &&
                Math.abs(values[3] - 1) < 0.001 &&
                Number.isFinite(values[4]) &&
                Number.isFinite(values[5])
              )
            }
            const matrix3d = /^matrix3d\(([^)]+)\)$/.exec(transform)
            if (!matrix3d) {
              return false
            }
            const values = matrix3d[1]
              .split(',')
              .map((value) => Number(value.trim()))
            if (values.length !== 16) {
              return false
            }
            return (
              Math.abs(values[0] - 1) < 0.001 &&
              Math.abs(values[5] - 1) < 0.001 &&
              Math.abs(values[10] - 1) < 0.001 &&
              Math.abs(values[15] - 1) < 0.001 &&
              Math.abs(values[1]) < 0.001 &&
              Math.abs(values[2]) < 0.001 &&
              Math.abs(values[3]) < 0.001 &&
              Math.abs(values[4]) < 0.001 &&
              Math.abs(values[6]) < 0.001 &&
              Math.abs(values[7]) < 0.001 &&
              Math.abs(values[8]) < 0.001 &&
              Math.abs(values[9]) < 0.001 &&
              Math.abs(values[11]) < 0.001 &&
              Number.isFinite(values[12]) &&
              Number.isFinite(values[13]) &&
              Number.isFinite(values[14])
            )
          }

          let current: HTMLElement | null = node as HTMLElement
          while (current) {
            const style = window.getComputedStyle(current)
            const opacity = Number.parseFloat(style.opacity || '1')
            if (opacity < 0.999) {
              return false
            }
            current = current.parentElement
          }

          const style = window.getComputedStyle(node)
          const opacity = Number.parseFloat(style.opacity || '1')
          const rect = (node as HTMLElement).getBoundingClientRect()
          const hasSize = rect.width > 0 && rect.height > 0

          if (
            !hasSize ||
            opacity < 0.999 ||
            !isIdentityTransform(style.transform)
          ) {
            return false
          }
          return true
        }),
      { timeout: 5000 },
    )
    .toBe(true)
  await page.evaluate(async () => {
    if (document.fonts?.status !== 'loaded') {
      await document.fonts?.ready
    }
  })
}

const waitForDialogToFullyAppear = async (
  page: Page,
  dialog: Locator,
): Promise<void> => {
  const dialogRoot = page.locator('.MuiDialog-root').first()
  await expect(dialogRoot).toBeVisible()
  await waitForAnimationsToFinish(dialogRoot)
  await waitForSurfaceToFullyAppear(page, dialog)
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
    await page.waitForTimeout(1000)
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

    const closeButton = row.locator('button', { hasText: 'x' }).first()
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

  test('render medium tab row component', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()

    const mediumTabUrlA =
      'data:text/html,<title>Medium%20Tab%20Snapshot</title>medium-tab-snapshot-a'
    const mediumTabUrlB =
      'data:text/html,<title>Medium%20Tab%20Snapshot</title>medium-tab-snapshot-b'
    await openPages(browserContext, [mediumTabUrlA, mediumTabUrlB])
    await page.bringToFront()
    await page.waitForTimeout(800)

    const mediumTabId = await page.evaluate(async () => {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const target = tabs.find((tab) =>
        (tab.url || '').includes('medium-tab-snapshot-a'),
      )
      return target?.id ?? -1
    })
    expect(mediumTabId).toBeGreaterThan(0)
    await page.reload()
    await waitForTestId(page, `tab-row-${mediumTabId}`)

    const tabRow = page.getByTestId(`tab-row-${mediumTabId}`)
    await expect(tabRow).toBeVisible()
    await page.mouse.move(1, 1)
    await page.waitForTimeout(200)
    const tabRowScreenshot = await tabRow.screenshot()
    expect(tabRowScreenshot).toMatchSnapshot('tab-row-medium.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
  })

  test('render medium window card component', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,<title>WindowCard1</title>window-card-1',
      'data:text/html,<title>WindowCard2</title>window-card-2',
      'data:text/html,<title>WindowCard3</title>window-card-3',
    ])
    await page.bringToFront()
    await page.waitForTimeout(1000)
    await page.reload()
    await page.waitForTimeout(600)

    const windowCard = page.locator(WINDOW_CARD_QUERY).first()
    await expect(windowCard).toBeVisible()
    await page.mouse.move(1, 1)
    await page.waitForTimeout(150)
    const windowCardScreenshot = await windowCard.screenshot()
    expect(windowCardScreenshot).toMatchSnapshot('window-card-medium.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    const windowTitle = windowCard.locator('[data-testid^="window-title-"]')
    await expect(windowTitle).toBeVisible()
    await windowTitle.hover()
    await page.waitForTimeout(150)
    const hoveredWindowCardScreenshot = await windowCard.screenshot()
    expect(hoveredWindowCardScreenshot).toMatchSnapshot(
      'window-card-hovered-state.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
  })

  test('render medium toolbar strip component', async () => {
    await page.evaluate(async () => {
      await chrome.storage.sync.set({
        toolbarAutoHide: false,
      })
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,<title>Toolbar1</title>toolbar-1',
      'data:text/html,<title>Toolbar2</title>toolbar-2',
    ])
    await page.bringToFront()
    await page.waitForTimeout(900)
    await page.reload()
    await page.waitForTimeout(500)

    const toolbar = page.locator('.toolbar').first()
    await expect(toolbar).toBeVisible()
    const toolbarScreenshot = await toolbar.screenshot()
    expect(toolbarScreenshot).toMatchSnapshot('toolbar-strip-medium.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
  })

  test('render medium settings dialog component', async () => {
    await page.evaluate(async () => {
      await chrome.storage.sync.set({
        toolbarAutoHide: false,
      })
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,<title>Settings</title>settings',
    ])
    await page.bringToFront()
    await page.waitForTimeout(700)

    const settingsButton = page.locator('button[aria-label="Settings"]').first()
    await expect(settingsButton).toBeVisible()
    await settingsButton.click()
    const settingsDialog = page.locator('.MuiDialog-paper').first()
    await waitForDialogToFullyAppear(page, settingsDialog)
    const settingsDialogScreenshot = await settingsDialog.screenshot({
      animations: 'disabled',
    })
    expect(settingsDialogScreenshot).toMatchSnapshot(
      'settings-dialog-medium.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  })

  test('render dnd row and window drop indicators', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,dnd-source',
      'data:text/html,dnd-target',
      'data:text/html,dnd-extra',
    ])
    await page.bringToFront()
    await page.waitForTimeout(900)

    const ids = await page.evaluate(async () => {
      const tabs = (
        await chrome.tabs.query({
          currentWindow: true,
        })
      )
        .filter((tab) => !(tab.url || '').startsWith('chrome-extension://'))
        .sort((a, b) => a.index - b.index)
      return {
        sourceId: tabs[0]?.id ?? -1,
        targetId: tabs[1]?.id ?? -1,
        winId: tabs[0]?.windowId ?? -1,
      }
    })
    expect(ids.sourceId).toBeGreaterThan(0)
    expect(ids.targetId).toBeGreaterThan(0)
    expect(ids.winId).toBeGreaterThan(0)
    await page.reload()
    await waitForTestId(page, `tab-row-${ids.sourceId}`)
    await waitForTestId(page, `tab-row-${ids.targetId}`)
    await waitForTestId(page, `window-drop-zone-top-${ids.winId}`)
    await waitForTestId(page, `window-drop-zone-bottom-${ids.winId}`)

    const targetRow = page.getByTestId(`tab-row-${ids.targetId}`)
    const targetDraggable = targetRow.locator(
      'xpath=ancestor::*[@draggable="true"][1]',
    )

    await page.evaluate(
      ({ sourceId, targetId, position }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        const targetNode = document.querySelector(
          `[data-testid="tab-row-${targetId}"]`,
        ) as HTMLElement | null
        if (!sourceNode || !targetNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        const dropTarget =
          (targetNode.parentElement as HTMLElement | null) || targetNode
        const sourceRect = source.getBoundingClientRect()
        const targetRect = dropTarget.getBoundingClientRect()
        const sourceX = sourceRect.left + sourceRect.width / 2
        const sourceY = sourceRect.top + sourceRect.height / 2
        const targetX = targetRect.left + Math.min(16, targetRect.width / 2)
        const targetY =
          position === 'before' ? targetRect.top + 2 : targetRect.bottom - 2
        const dataTransfer = new DataTransfer()
        source.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            dataTransfer,
          }),
        )
        dropTarget.dispatchEvent(
          new DragEvent('dragenter', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        dropTarget.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        return true
      },
      { sourceId: ids.sourceId, targetId: ids.targetId, position: 'before' },
    )
    await expect(
      targetDraggable.locator('hr.border-red-700').first(),
    ).toBeVisible()
    const beforeIndicator = await targetDraggable.screenshot()
    expect(beforeIndicator).toMatchSnapshot('dnd-row-indicator-before.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    await page.evaluate(
      ({ sourceId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        if (!sourceNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        source.dispatchEvent(
          new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer(),
          }),
        )
        return true
      },
      { sourceId: ids.sourceId },
    )

    await page.evaluate(
      ({ sourceId, targetId, position }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        const targetNode = document.querySelector(
          `[data-testid="tab-row-${targetId}"]`,
        ) as HTMLElement | null
        if (!sourceNode || !targetNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        const dropTarget =
          (targetNode.parentElement as HTMLElement | null) || targetNode
        const sourceRect = source.getBoundingClientRect()
        const targetRect = dropTarget.getBoundingClientRect()
        const sourceX = sourceRect.left + sourceRect.width / 2
        const sourceY = sourceRect.top + sourceRect.height / 2
        const targetX = targetRect.left + Math.min(16, targetRect.width / 2)
        const targetY =
          position === 'before' ? targetRect.top + 2 : targetRect.bottom - 2
        const dataTransfer = new DataTransfer()
        source.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            dataTransfer,
          }),
        )
        dropTarget.dispatchEvent(
          new DragEvent('dragenter', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        dropTarget.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        return true
      },
      { sourceId: ids.sourceId, targetId: ids.targetId, position: 'after' },
    )
    await expect(
      targetDraggable.locator('hr.border-red-700').first(),
    ).toBeVisible()
    const afterIndicator = await targetDraggable.screenshot()
    expect(afterIndicator).toMatchSnapshot('dnd-row-indicator-after.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    await page.evaluate(
      ({ sourceId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        if (!sourceNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        source.dispatchEvent(
          new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer(),
          }),
        )
        return true
      },
      { sourceId: ids.sourceId },
    )

    const topZone = page.getByTestId(`window-drop-zone-top-${ids.winId}`)
    await page.evaluate(
      ({ sourceId, winId, position }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        const zoneNode = document.querySelector(
          `[data-testid="window-drop-zone-${position}-${winId}"]`,
        ) as HTMLElement | null
        if (!sourceNode || !zoneNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        const sourceRect = source.getBoundingClientRect()
        const zoneRect = zoneNode.getBoundingClientRect()
        const sourceX = sourceRect.left + sourceRect.width / 2
        const sourceY = sourceRect.top + sourceRect.height / 2
        const targetX = zoneRect.left + zoneRect.width / 2
        const targetY = zoneRect.top + zoneRect.height / 2
        const dataTransfer = new DataTransfer()
        source.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragenter', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        return true
      },
      { sourceId: ids.sourceId, winId: ids.winId, position: 'top' },
    )
    await expect(topZone.locator('hr.border-red-700')).toHaveCount(1)
    const topZoneIndicator = await topZone.screenshot()
    expect(topZoneIndicator).toMatchSnapshot(
      'dnd-window-zone-top-indicator.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
    await page.evaluate(
      ({ sourceId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        if (!sourceNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        source.dispatchEvent(
          new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer(),
          }),
        )
        return true
      },
      { sourceId: ids.sourceId },
    )

    const bottomZone = page.getByTestId(`window-drop-zone-bottom-${ids.winId}`)
    await page.evaluate(
      ({ sourceId, winId, position }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        const zoneNode = document.querySelector(
          `[data-testid="window-drop-zone-${position}-${winId}"]`,
        ) as HTMLElement | null
        if (!sourceNode || !zoneNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        const sourceRect = source.getBoundingClientRect()
        const zoneRect = zoneNode.getBoundingClientRect()
        const sourceX = sourceRect.left + sourceRect.width / 2
        const sourceY = sourceRect.top + sourceRect.height / 2
        const targetX = zoneRect.left + zoneRect.width / 2
        const targetY = zoneRect.top + zoneRect.height / 2
        const dataTransfer = new DataTransfer()
        source.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragenter', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        return true
      },
      { sourceId: ids.sourceId, winId: ids.winId, position: 'bottom' },
    )
    await expect(bottomZone.locator('hr.border-red-700')).toHaveCount(1)
    const bottomZoneIndicator = await bottomZone.screenshot()
    expect(bottomZoneIndicator).toMatchSnapshot(
      'dnd-window-zone-bottom-indicator.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
    await page.evaluate(
      ({ sourceId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        if (!sourceNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        source.dispatchEvent(
          new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer(),
          }),
        )
        return true
      },
      { sourceId: ids.sourceId },
    )
  })

  test('render drag preview for single tab and group drag', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,drag-preview-1',
      'data:text/html,drag-preview-2',
      'data:text/html,drag-preview-3',
    ])
    await page.bringToFront()
    await page.waitForTimeout(900)

    const groupId = await groupTabsByUrl(page, {
      urls: ['data:text/html,drag-preview-2', 'data:text/html,drag-preview-3'],
      title: 'Preview Group',
      color: 'purple',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(700)

    const sourceState = await page.evaluate(async () => {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const source = tabs.find((tab) =>
        (tab.url || '').includes('drag-preview-1'),
      )
      return {
        sourceTabId: source?.id ?? -1,
        windowId: source?.windowId ?? -1,
      }
    })
    expect(sourceState.sourceTabId).toBeGreaterThan(0)
    expect(sourceState.windowId).toBeGreaterThan(0)
    await page.reload()
    await waitForTestId(page, `tab-row-${sourceState.sourceTabId}`)
    await waitForTestId(page, `tab-group-header-${groupId}`)
    await waitForTestId(page, `window-drop-zone-top-${sourceState.windowId}`)

    await page.evaluate(
      ({ sourceId, targetZoneTestId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        const zoneNode = document.querySelector(
          `[data-testid="${targetZoneTestId}"]`,
        ) as HTMLElement | null
        if (!sourceNode || !zoneNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        const sourceRect = source.getBoundingClientRect()
        const zoneRect = zoneNode.getBoundingClientRect()
        const sourceX = sourceRect.left + sourceRect.width / 2
        const sourceY = sourceRect.top + sourceRect.height / 2
        const targetX = zoneRect.left + zoneRect.width / 2
        const targetY = zoneRect.top + zoneRect.height / 2
        const dataTransfer = new DataTransfer()
        source.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragenter', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        return true
      },
      {
        sourceId: sourceState.sourceTabId,
        targetZoneTestId: `window-drop-zone-top-${sourceState.windowId}`,
      },
    )
    const singlePreviewHead = page
      .locator('h3')
      .filter({ hasText: '1 tab' })
      .first()
    await expect(singlePreviewHead).toBeVisible()
    const singlePreview = await singlePreviewHead
      .locator('xpath=..')
      .screenshot()
    expect(singlePreview).toMatchSnapshot('drag-preview-single-tab.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    await page.evaluate(
      ({ sourceId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        if (!sourceNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        source.dispatchEvent(
          new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer(),
          }),
        )
        return true
      },
      { sourceId: sourceState.sourceTabId },
    )

    await page.getByTestId(`tab-group-header-${groupId}`).hover()
    const groupHandle = page.getByTestId(`tab-group-drag-handle-${groupId}`)
    await expect(groupHandle).toBeVisible()
    await page.evaluate(
      ({ groupId, targetZoneTestId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-group-drag-handle-${groupId}"]`,
        ) as HTMLElement | null
        const zoneNode = document.querySelector(
          `[data-testid="${targetZoneTestId}"]`,
        ) as HTMLElement | null
        if (!sourceNode || !zoneNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        const sourceRect = source.getBoundingClientRect()
        const zoneRect = zoneNode.getBoundingClientRect()
        const sourceX = sourceRect.left + sourceRect.width / 2
        const sourceY = sourceRect.top + sourceRect.height / 2
        const targetX = zoneRect.left + zoneRect.width / 2
        const targetY = zoneRect.top + zoneRect.height / 2
        const dataTransfer = new DataTransfer()
        source.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragenter', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        return true
      },
      {
        groupId,
        targetZoneTestId: `window-drop-zone-top-${sourceState.windowId}`,
      },
    )
    const groupPreviewHead = page
      .locator('h3')
      .filter({ hasText: '2 tabs' })
      .first()
    await expect(groupPreviewHead).toBeVisible()
    const groupPreview = await groupPreviewHead.locator('xpath=..').screenshot()
    expect(groupPreview).toMatchSnapshot('drag-preview-group-tabs.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    await page.evaluate(
      ({ groupId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-group-drag-handle-${groupId}"]`,
        ) as HTMLElement | null
        if (!sourceNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        source.dispatchEvent(
          new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer(),
          }),
        )
        return true
      },
      { groupId },
    )
  })

  test('render group header state variants', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
      await chrome.windows.create({
        url: 'data:text/html,group-header-move-target',
        focused: false,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,gh-state-a',
      'data:text/html,gh-state-b',
      'data:text/html,gh-state-c',
    ])
    await page.bringToFront()
    await page.waitForTimeout(900)

    const groupId = await groupTabsByUrl(page, {
      urls: [
        'data:text/html,gh-state-a',
        'data:text/html,gh-state-b',
        'data:text/html,gh-state-c',
      ],
      title: 'Header States',
      color: 'orange',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(700)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    await page.getByTestId(`tab-group-toggle-${groupId}`).click()
    await page.waitForTimeout(500)
    const queryInput = page.locator(
      'input[placeholder*="Search your tab title or URL"]',
    )
    await queryInput.fill('gh-state-b')
    await page.waitForTimeout(500)

    const header = page.getByTestId(`tab-group-header-${groupId}`)
    await expect(page.getByTestId(`tab-group-count-${groupId}`)).toHaveText(
      '1/3',
    )
    const collapsedHeader = await header.screenshot()
    expect(collapsedHeader).toMatchSnapshot(
      'group-header-collapsed-matched-count.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )

    await page.getByTestId(`tab-group-menu-${groupId}`).click()
    const groupMenu = page.locator('.MuiPopover-root .MuiPaper-root').last()
    await waitForSurfaceToFullyAppear(page, groupMenu)
    const groupMenuScreenshot = await groupMenu.screenshot({
      animations: 'disabled',
    })
    expect(groupMenuScreenshot).toMatchSnapshot('group-header-menu-open.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
  })

  test('render tab row state variants', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,dup-row-state',
      'data:text/html,dup-row-state',
      'data:text/html,pinned-row-state',
      'data:text/html,unmatched-row-state',
    ])
    await page.bringToFront()
    await page.waitForTimeout(900)

    const ids = await page.evaluate(async () => {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const duplicated = tabs.find((tab) =>
        (tab.url || '').includes('dup-row-state'),
      )
      const pinned = tabs.find((tab) =>
        (tab.url || '').includes('pinned-row-state'),
      )
      const unmatched = tabs.find((tab) =>
        (tab.url || '').includes('unmatched-row-state'),
      )
      if (pinned?.id) {
        await chrome.tabs.update(pinned.id, { pinned: true })
      }
      return {
        duplicatedId: duplicated?.id ?? -1,
        pinnedId: pinned?.id ?? -1,
        unmatchedId: unmatched?.id ?? -1,
      }
    })
    expect(ids.duplicatedId).toBeGreaterThan(0)
    expect(ids.pinnedId).toBeGreaterThan(0)
    expect(ids.unmatchedId).toBeGreaterThan(0)

    await page.reload()
    await waitForTestId(page, `tab-row-${ids.duplicatedId}`)
    await waitForTestId(page, `tab-row-${ids.pinnedId}`)
    await waitForTestId(page, `tab-row-${ids.unmatchedId}`)

    const queryInput = page.locator(
      'input[placeholder*="Search your tab title or URL"]',
    )
    await queryInput.fill('pinned-row-state')
    await page.waitForTimeout(500)

    const pinnedRow = page.getByTestId(`tab-row-${ids.pinnedId}`)
    const pinnedShot = await pinnedRow.screenshot()
    expect(pinnedShot).toMatchSnapshot('tab-row-state-pinned.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    const duplicatedRow = page.getByTestId(`tab-row-${ids.duplicatedId}`)
    await expect(duplicatedRow.locator('button.text-red-400')).toHaveCount(1)
    const duplicatedShot = await duplicatedRow.screenshot()
    expect(duplicatedShot).toMatchSnapshot('tab-row-state-duplicated.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    const unmatchedRow = page.getByTestId(`tab-row-${ids.unmatchedId}`)
    await expect(unmatchedRow).toHaveClass(/opacity-25/)
    const unmatchedShot = await unmatchedRow.screenshot()
    expect(unmatchedShot).toMatchSnapshot('tab-row-state-unmatched.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const selectButton = pinnedRow
      .locator('[aria-label="Toggle select"]')
      .first()
    await selectButton.click({ force: true })
    await expect(pinnedRow).toHaveClass(/bg-blue-300|bg-gray-900/)
    const selectedShot = await pinnedRow.screenshot()
    expect(selectedShot).toMatchSnapshot('tab-row-state-selected.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    const focusButton = unmatchedRow
      .locator('[aria-label="Toggle select"]')
      .first()
    await focusButton.focus()
    const focusedControlShot = await focusButton.screenshot()
    expect(focusedControlShot).toMatchSnapshot(
      'tab-row-state-focused-control.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )

    const focusRowButton = unmatchedRow.getByRole('button', {
      name: /unmatched-row-state/i,
    })
    await focusRowButton.focus()
    await unmatchedRow.focus()
    await expect(unmatchedRow).toBeFocused()
    const focusedRowShot = await unmatchedRow.screenshot()
    expect(focusedRowShot).toMatchSnapshot('tab-row-state-focused-row.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    const toggleThemeButton = page
      .locator('[aria-label="Toggle light/dark theme"]')
      .first()
    await toggleThemeButton.click()
    await page.waitForTimeout(600)
    await unmatchedRow.focus()
    await expect(unmatchedRow).toBeFocused()
    const focusedRowDarkShot = await unmatchedRow.screenshot()
    expect(focusedRowDarkShot).toMatchSnapshot(
      'tab-row-state-focused-row-dark.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
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
      'input[placeholder*="Search your tab title or URL"]',
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
      .locator('button[aria-label="Clean duplicated tabs"]')
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

    const themeSelect = page.locator('#theme-select').first()
    await themeSelect.click()
    const themeMenu = page.locator('.MuiPopover-root .MuiPaper-root').last()
    await waitForSurfaceToFullyAppear(page, themeMenu)
    const themeMenuShot = await themeMenu.screenshot({
      animations: 'disabled',
    })
    expect(themeMenuShot).toMatchSnapshot('settings-theme-dropdown-open.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    await page.keyboard.press('Escape')

    const fontSlider = page.locator('[aria-label="Update Font Size"]').first()
    await expect(fontSlider).toBeVisible()
    const fontSliderBox = await fontSlider.boundingBox()
    if (!fontSliderBox) {
      throw new Error('Failed to resolve font-size slider geometry')
    }
    await page.mouse.click(
      fontSliderBox.x + 4,
      fontSliderBox.y + fontSliderBox.height / 2,
    )
    await page.waitForTimeout(300)
    const sliderMinShot = await fontSlider.screenshot()
    expect(sliderMinShot).toMatchSnapshot('settings-font-slider-min.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    await page.mouse.click(
      fontSliderBox.x + fontSliderBox.width - 4,
      fontSliderBox.y + fontSliderBox.height / 2,
    )
    await page.waitForTimeout(300)
    const sliderMaxShot = await fontSlider.screenshot()
    expect(sliderMaxShot).toMatchSnapshot('settings-font-slider-max.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
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
      'input[placeholder*="Search your tab title or URL"]',
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
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const groupId = await groupTabsByUrl(page, {
      urls: ['https://pinboard.in/', 'https://nextjs.org/'],
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

    const inputSelector = 'input[placeholder*="Search your tab title or URL"]'
    await page.fill(inputSelector, 'SearchDocs')
    await page.waitForTimeout(600)
    await expect(page.getByTestId(`tab-group-header-${groupId}`)).toHaveCount(1)
    for (const tabId of groupedTabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(1)
    }
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
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const groupId = await groupTabsByUrl(page, {
      urls: ['https://pinboard.in/', 'https://nextjs.org/'],
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
    await openPages(browserContext, URLS)
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
