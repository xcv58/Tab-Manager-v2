import { Page, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  CLOSE_PAGES,
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
  createWindowsWithTabs,
  waitForTestId,
  waitForDefaultExtensionView,
  waitForLocatorRectToStabilize,
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

const AUTO_FIT_WINDOW_URLS = Array.from({ length: 5 }, (_, windowIndex) =>
  Array.from(
    { length: 6 },
    (_, tabIndex) =>
      `about:blank#auto-fit-window-${windowIndex}-tab-${tabIndex}`,
  ),
)

const writeExtensionSettings = async (
  page: Page,
  settings: Record<string, unknown>,
) => {
  await page.evaluate(async (nextSettings) => {
    await chrome.storage.local.set(nextSettings)
    if (chrome.storage.sync?.set) {
      await chrome.storage.sync.set(nextSettings)
    }
  }, settings)
}

const getScrollContainerMetrics = async (page: Page) => {
  return page.getByTestId('window-list-scroll-container').evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
  }))
}

const getRenderedWindowColumnCount = async (page: Page) => {
  return await page.locator('[data-testid^="window-column-"]').count()
}

const setupAutoFitColumnsScenario = async (
  page: Page,
  settings: Record<string, unknown> = {},
) => {
  await writeExtensionSettings(page, {
    autoFitColumns: true,
    tabWidth: 20,
    ...settings,
  })
  const createdWindowIds = await createWindowsWithTabs(
    page,
    AUTO_FIT_WINDOW_URLS,
  )
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await waitForTestId(page, `window-card-${createdWindowIds[0]}`)
  await waitForMainSurfaceToSettle(page)
  return createdWindowIds
}

const setupLayoutJumpScenario = async (page: Page) => {
  const setup = await page.evaluate(async () => {
    const currentWindow = await chrome.windows.getCurrent({})
    const baseWindowId = currentWindow.id
    if (typeof baseWindowId !== 'number') {
      return null
    }

    const groupedUrls = Array.from(
      { length: 8 },
      (_, index) => `about:blank#jump-group-${index}`,
    )
    for (const url of groupedUrls) {
      await chrome.tabs.create({
        windowId: baseWindowId,
        url,
        active: false,
      })
    }

    const sideWindow = await chrome.windows.create({
      url: 'about:blank#jump-side-window',
      focused: false,
    })
    const sideWindowId = sideWindow.id
    if (typeof sideWindowId !== 'number') {
      return null
    }

    const tabs = await chrome.tabs.query({ windowId: baseWindowId })
    const groupTabIds = tabs
      .filter((tab) => (tab.url || '').includes('#jump-group-'))
      .map((tab) => tab.id)
      .filter((tabId): tabId is number => typeof tabId === 'number')
    if (groupTabIds.length < 6) {
      return null
    }

    const groupId = await chrome.tabs.group({
      tabIds: groupTabIds,
      createProperties: {
        windowId: baseWindowId,
      },
    })
    await chrome.tabGroups.update(groupId, {
      title: 'Jump Group',
      color: 'blue',
      collapsed: false,
    })
    return {
      groupId,
      baseWindowId,
      sideWindowId,
    }
  })

  if (!setup) {
    throw new Error('Failed to setup layout jump scenario')
  }
  return setup
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

  test('group toggle keeps stable columns until manual repack', async () => {
    await page.setViewportSize({
      width: 1400,
      height: 420,
    })
    const { baseWindowId, sideWindowId, groupId } =
      await setupLayoutJumpScenario(page)

    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)
    await waitForTestId(page, `window-card-${baseWindowId}`)
    await waitForTestId(page, `window-card-${sideWindowId}`)

    const windowCard = page.getByTestId(`window-card-${baseWindowId}`)
    const sideWindowCard = page.getByTestId(`window-card-${sideWindowId}`)
    const widthBefore = await windowCard.evaluate(
      (node) => node.getBoundingClientRect().width,
    )
    const sideXBefore = await sideWindowCard.evaluate(
      (node) => node.getBoundingClientRect().x,
    )

    await page.getByTestId(`tab-group-toggle-${groupId}`).click()
    await expect
      .poll(
        async () =>
          page.evaluate(async (targetGroupId) => {
            const tabGroup = await chrome.tabGroups.get(targetGroupId)
            return !!tabGroup.collapsed
          }, groupId),
        { timeout: 1500 },
      )
      .toBe(true)

    await page.waitForTimeout(900)
    const widthBeforeManualRepack = await windowCard.evaluate(
      (node) => node.getBoundingClientRect().width,
    )
    const sideXBeforeManualRepack = await sideWindowCard.evaluate(
      (node) => node.getBoundingClientRect().x,
    )
    expect(Math.abs(widthBeforeManualRepack - widthBefore)).toBeLessThan(2)
    expect(Math.abs(sideXBeforeManualRepack - sideXBefore)).toBeLessThan(2)
    const isDirty = await page.getByTestId('layout-repack-button').isVisible()

    if (!isDirty) {
      await expect(page.getByTestId('layout-repack-button')).toBeHidden()
      return
    }

    await expect(page.getByTestId('layout-repack-button')).toBeVisible()
    await page.getByTestId('layout-repack-button').click()
    await expect(page.getByTestId('layout-repack-button')).toBeHidden()

    await expect
      .poll(
        async () => {
          const widthAfter = await windowCard.evaluate(
            (node) => node.getBoundingClientRect().width,
          )
          return Math.abs(widthAfter - widthBefore)
        },
        { timeout: 2200 },
      )
      .toBeGreaterThan(4)
  })

  test('window hide toggle keeps stable columns until manual repack', async () => {
    await page.setViewportSize({
      width: 1400,
      height: 420,
    })
    const { baseWindowId, sideWindowId } = await setupLayoutJumpScenario(page)

    await page.reload()
    await waitForTestId(page, `window-title-${baseWindowId}`)
    await waitForTestId(page, `window-card-${baseWindowId}`)
    await waitForTestId(page, `window-card-${sideWindowId}`)

    const titleRow = page.getByTestId(`window-title-${baseWindowId}`)
    const hideToggle = titleRow
      .locator('button[aria-label="Toggle window hide"]')
      .first()
    const windowCard = page.getByTestId(`window-card-${baseWindowId}`)
    const sideWindowCard = page.getByTestId(`window-card-${sideWindowId}`)
    const widthBefore = await windowCard.evaluate(
      (node) => node.getBoundingClientRect().width,
    )
    const sideXBefore = await sideWindowCard.evaluate(
      (node) => node.getBoundingClientRect().x,
    )

    await titleRow.hover()
    await expect(hideToggle).toBeVisible()
    await hideToggle.click()
    await page.waitForTimeout(900)
    const widthBeforeManualRepack = await windowCard.evaluate(
      (node) => node.getBoundingClientRect().width,
    )
    const sideXBeforeManualRepack = await sideWindowCard.evaluate(
      (node) => node.getBoundingClientRect().x,
    )
    expect(Math.abs(widthBeforeManualRepack - widthBefore)).toBeLessThan(2)
    expect(Math.abs(sideXBeforeManualRepack - sideXBefore)).toBeLessThan(2)
    const isDirty = await page.getByTestId('layout-repack-button').isVisible()

    if (!isDirty) {
      await expect(page.getByTestId('layout-repack-button')).toBeHidden()
      return
    }

    await expect(page.getByTestId('layout-repack-button')).toBeVisible()
    await page.getByTestId('layout-repack-button').click()
    await expect(page.getByTestId('layout-repack-button')).toBeHidden()

    await expect
      .poll(
        async () => {
          const widthAfter = await windowCard.evaluate(
            (node) => node.getBoundingClientRect().width,
          )
          return Math.abs(widthAfter - widthBefore)
        },
        { timeout: 2200 },
      )
      .toBeGreaterThan(4)
  })

  test('group toggle flushes dirty layout on window blur', async () => {
    await page.setViewportSize({
      width: 1400,
      height: 420,
    })
    const { baseWindowId, sideWindowId, groupId } =
      await setupLayoutJumpScenario(page)

    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)
    await waitForTestId(page, `window-card-${baseWindowId}`)
    await waitForTestId(page, `window-card-${sideWindowId}`)

    const windowCard = page.getByTestId(`window-card-${baseWindowId}`)
    const widthBefore = await windowCard.evaluate(
      (node) => node.getBoundingClientRect().width,
    )

    await page.getByTestId(`tab-group-toggle-${groupId}`).click()
    await page.waitForTimeout(500)
    const isDirty = await page.getByTestId('layout-repack-button').isVisible()

    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'))
    })
    await expect(page.getByTestId('layout-repack-button')).toBeHidden()

    if (!isDirty) {
      const widthAfter = await windowCard.evaluate(
        (node) => node.getBoundingClientRect().width,
      )
      expect(Math.abs(widthAfter - widthBefore)).toBeLessThan(2)
      return
    }

    await expect
      .poll(
        async () => {
          const widthAfter = await windowCard.evaluate(
            (node) => node.getBoundingClientRect().width,
          )
          return Math.abs(widthAfter - widthBefore)
        },
        { timeout: 2200 },
      )
      .toBeGreaterThan(4)
  })

  test('sync shortcut always repacks and clears dirty state', async () => {
    await page.setViewportSize({
      width: 1400,
      height: 420,
    })
    const { baseWindowId, sideWindowId, groupId } =
      await setupLayoutJumpScenario(page)

    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)
    await waitForTestId(page, `window-card-${baseWindowId}`)
    await waitForTestId(page, `window-card-${sideWindowId}`)

    const windowCard = page.getByTestId(`window-card-${baseWindowId}`)
    const widthBefore = await windowCard.evaluate(
      (node) => node.getBoundingClientRect().width,
    )

    await page.getByTestId(`tab-group-toggle-${groupId}`).click()
    await page.waitForTimeout(500)
    const isDirty = await page.getByTestId('layout-repack-button').isVisible()

    await page.locator('main').click()
    await page.keyboard.press('s')
    await expect(page.getByTestId('layout-repack-button')).toBeHidden()

    if (!isDirty) {
      return
    }

    await expect
      .poll(
        async () => {
          const widthAfter = await windowCard.evaluate(
            (node) => node.getBoundingClientRect().width,
          )
          return Math.abs(widthAfter - widthBefore)
        },
        { timeout: 2200 },
      )
      .toBeGreaterThan(4)
  })

  test('auto-fit columns avoids horizontal scrolling in wide windows', async () => {
    await page.setViewportSize({
      width: 1400,
      height: 720,
    })

    await setupAutoFitColumnsScenario(page)

    await expect
      .poll(() => getRenderedWindowColumnCount(page), { timeout: 5000 })
      .toBe(4)

    const metrics = await getScrollContainerMetrics(page)
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
  })

  test('auto-fit columns reduces the rendered column count after narrowing the window', async () => {
    await page.setViewportSize({
      width: 960,
      height: 720,
    })

    await setupAutoFitColumnsScenario(page)

    await expect
      .poll(() => getRenderedWindowColumnCount(page), { timeout: 5000 })
      .toBe(3)

    await page.setViewportSize({
      width: 640,
      height: 720,
    })
    await waitForMainSurfaceToSettle(page)

    await expect
      .poll(() => getRenderedWindowColumnCount(page), { timeout: 5000 })
      .toBe(2)

    const metrics = await getScrollContainerMetrics(page)
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
  })

  test('auto-fit columns honors minimum tab width when computing columns', async () => {
    await page.setViewportSize({
      width: 960,
      height: 720,
    })

    await setupAutoFitColumnsScenario(page)

    await expect
      .poll(() => getRenderedWindowColumnCount(page), { timeout: 5000 })
      .toBe(3)

    await writeExtensionSettings(page, {
      autoFitColumns: true,
      tabWidth: 24,
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await waitForMainSurfaceToSettle(page)

    await expect
      .poll(() => getRenderedWindowColumnCount(page), { timeout: 5000 })
      .toBe(2)

    const metrics = await getScrollContainerMetrics(page)
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
  })
})
