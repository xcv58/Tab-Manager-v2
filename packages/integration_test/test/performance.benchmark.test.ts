import { Page, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  CLOSE_PAGES,
  closeCurrentWindowTabsExceptActive,
  createWindowsWithTabs,
  getGroupMembers,
  groupTabsByUrlInWindow,
  initBrowserWithExtension,
  waitForTestId,
  waitForDefaultExtensionView,
} from '../util'
import {
  buildGroupedBenchmarkWindowUrls,
  getExpectedGroupedHeaderCount,
  getExpectedGroupedMatchCount,
  getExpectedGroupedRowCount,
  GroupedBenchmarkWorkload,
  startBenchmarkFixtureServer,
  BenchmarkFixtureServer,
} from '../performanceHarness'

const SEARCH_SELECTOR = 'input[type="text"][placeholder*="Search"]'
const GROUP_COLORS: chrome.tabGroups.ColorEnum[] = [
  'blue',
  'green',
  'yellow',
  'pink',
  'purple',
  'cyan',
  'orange',
  'red',
  'grey',
]

const MEDIUM_WORKLOAD: GroupedBenchmarkWorkload = {
  name: 'medium',
  windowCount: 4,
  tabsPerWindow: 50,
  groupSize: 10,
  matchEvery: 25,
}

const LARGE_WORKLOAD: GroupedBenchmarkWorkload = {
  name: 'large',
  windowCount: 4,
  tabsPerWindow: 100,
  groupSize: 10,
  matchEvery: 25,
}

const DRAG_WINDOW_COUNT = 2
const DRAG_TABS_PER_WINDOW = 8
const DRAG_GROUP_SIZE = 4

type PopupState = {
  windowCards: number
  tabRows: number
  groupHeaders: number
  loadingVisible: boolean
  searchValue: string
}

type KeyboardBenchmarkState = {
  focusedTestId: string
  scrollTop: number
}

type SelectedCountState = {
  selectedCount: number
  focusedTestId: string
}

type GroupMoveState = {
  contiguous: boolean
  groupStart: number
  targetIndex: number
}

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string
let fixtureServer: BenchmarkFixtureServer

const buildDataUrl = (label: string) =>
  `data:text/html,${encodeURIComponent(`<title>${label}</title>${label}`)}`

const readPopupState = async (page: Page): Promise<PopupState> =>
  await page.evaluate((searchSelector) => {
    const count = (selector: string) =>
      document.querySelectorAll(selector).length
    const visible = (selector: string) => {
      const node = document.querySelector(selector)
      if (!node) {
        return false
      }
      const style = window.getComputedStyle(node)
      return style.display !== 'none' && style.visibility !== 'hidden'
    }

    return {
      windowCards: count('[data-testid^="window-card-"]'),
      tabRows: count('[data-testid^="tab-row-"]'),
      groupHeaders: count('[data-testid^="tab-group-header-"]'),
      loadingVisible: visible('[data-testid="loading"]'),
      searchValue:
        (document.querySelector(searchSelector) as HTMLInputElement | null)
          ?.value || '',
    }
  }, SEARCH_SELECTOR)

const readFocusedTestId = async (page: Page) =>
  await page.evaluate(
    () => document.activeElement?.getAttribute('data-testid') || '',
  )

const readSelectedCountState = async (
  page: Page,
): Promise<SelectedCountState> =>
  await page.evaluate(() => {
    const text =
      Array.from(document.querySelectorAll('p')).find((node) =>
        /selected/.test(node.textContent || ''),
      )?.textContent || ''
    const match = text.match(/,\s*(\d+)\s+tabs?\s+selected/i)
    return {
      selectedCount: match ? Number(match[1]) : -1,
      focusedTestId: document.activeElement?.getAttribute('data-testid') || '',
    }
  })

const readKeyboardBenchmarkState = async (
  page: Page,
): Promise<KeyboardBenchmarkState> =>
  await page.evaluate(() => {
    const container = document.querySelector(
      '[data-testid="window-list-scroll-container"]',
    )
    return {
      focusedTestId: document.activeElement?.getAttribute('data-testid') || '',
      scrollTop: container instanceof HTMLDivElement ? container.scrollTop : -1,
    }
  })

const waitForPopupState = async (
  page: Page,
  label: string,
  predicate: (state: PopupState) => boolean,
  timeout = 15000,
) => {
  const startedAt = Date.now()
  let latestState = await readPopupState(page)
  await expect
    .poll(
      async () => {
        latestState = await readPopupState(page)
        return predicate(latestState)
      },
      { timeout },
    )
    .toBe(true)
  const elapsedMs = Date.now() - startedAt
  console.log(
    `[performance-benchmark] ${label}`,
    JSON.stringify({ elapsedMs, state: latestState }),
  )
  return { elapsedMs, state: latestState }
}

const measureStateTransition = async <T>({
  label,
  action,
  readState,
  predicate,
  timeout = 15000,
}: {
  label: string
  action: () => Promise<void>
  readState: () => Promise<T>
  predicate: (state: T) => boolean
  timeout?: number
}) => {
  const startedAt = Date.now()
  let latestState = await readState()
  await action()
  await expect
    .poll(
      async () => {
        latestState = await readState()
        return predicate(latestState)
      },
      { timeout },
    )
    .toBe(true)
  const elapsedMs = Date.now() - startedAt
  console.log(
    `[performance-benchmark] ${label}`,
    JSON.stringify({ elapsedMs, state: latestState }),
  )
  return { elapsedMs, state: latestState }
}

const focusByKeyboardUntil = async (
  page: Page,
  predicate: (testId: string) => boolean,
  maxSteps = 40,
) => {
  for (let index = 0; index < maxSteps; index += 1) {
    await page.keyboard.press('j')
    const focusedTestId = await readFocusedTestId(page)
    if (predicate(focusedTestId)) {
      return focusedTestId
    }
  }
  throw new Error('Unable to focus requested row by keyboard navigation')
}

const groupTabsInWindowWithRetry = async ({
  page,
  windowId,
  urls,
  title,
  color,
}: {
  page: Page
  windowId: number
  urls: string[]
  title: string
  color: chrome.tabGroups.ColorEnum
}) => {
  let lastError: unknown = null
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const groupId = await groupTabsByUrlInWindow(page, {
        windowId,
        urls,
        title,
        color,
      })
      if (groupId > -1) {
        return groupId
      }
      lastError = new Error(
        `groupTabsByUrlInWindow returned ${groupId} for ${title}`,
      )
    } catch (error) {
      lastError = error
      const message = String(error)
      if (!message.includes('No tab with id')) {
        throw error
      }
    }
    await page.waitForTimeout(250)
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to create grouped tabs for ${title}`)
}

const resetExtensionState = async () => {
  await page.bringToFront()
  await page.goto(extensionURL)
  await page.evaluate(async () => {
    await chrome.storage.local.clear()
    if (chrome.storage.sync?.clear) {
      await chrome.storage.sync.clear()
    }
    if (chrome.storage.sync?.set) {
      await chrome.storage.sync.set({
        preserveSearch: false,
        searchHistory: false,
        showUnmatchedTab: false,
        showUrl: false,
      })
    }
    await chrome.storage.local.set({
      query: '',
      showUnmatchedTab: false,
    })
  })
  await CLOSE_PAGES(browserContext)
  await closeCurrentWindowTabsExceptActive(page, extensionURL)
  await page.goto(extensionURL)
  await waitForDefaultExtensionView(page)
}

const setupGroupedWorkspace = async (workload: GroupedBenchmarkWorkload) => {
  const windowsUrls = buildGroupedBenchmarkWindowUrls(
    fixtureServer.baseUrl,
    workload,
  )
  const windowIds = await createWindowsWithTabs(page, windowsUrls)
  expect(windowIds).toHaveLength(workload.windowCount)
  const groupIdsByWindow: number[][] = []

  for (const [windowIndex, windowId] of windowIds.entries()) {
    await expect
      .poll(
        async () =>
          await page.evaluate(async (targetWindowId) => {
            const tabs = await chrome.tabs.query({ windowId: targetWindowId })
            return tabs.length
          }, windowId),
        { timeout: 15000 },
      )
      .toBe(workload.tabsPerWindow)

    const urls = windowsUrls[windowIndex]
    const windowGroupIds: number[] = []
    for (
      let startIndex = 0;
      startIndex < workload.tabsPerWindow;
      startIndex += workload.groupSize
    ) {
      const groupId = await groupTabsInWindowWithRetry({
        page,
        windowId,
        urls: urls.slice(startIndex, startIndex + workload.groupSize),
        title: `Group ${windowIndex}-${startIndex / workload.groupSize}`,
        color:
          GROUP_COLORS[(startIndex / workload.groupSize) % GROUP_COLORS.length],
      })
      expect(groupId).toBeGreaterThan(-1)
      windowGroupIds.push(groupId)
    }
    groupIdsByWindow.push(windowGroupIds)
  }

  await page.goto(extensionURL)
  await page.locator(SEARCH_SELECTOR).waitFor({ timeout: 15000 })
  return {
    expectedTabRows: getExpectedGroupedRowCount(workload) + 1,
    expectedGroupHeaders: getExpectedGroupedHeaderCount(workload),
    expectedMatches: getExpectedGroupedMatchCount(workload),
    groupIdsByWindow,
    windowIds,
  }
}

test.describe('Performance benchmark scenarios', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(120000)

  test.beforeAll(async () => {
    fixtureServer = await startBenchmarkFixtureServer()
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
    await fixtureServer?.close()
    fixtureServer = null
  })

  test.beforeEach(async () => {
    await resetExtensionState()
  })

  test.afterEach(async () => {
    await CLOSE_PAGES(browserContext)
  })

  test('measures grouped popup open for the medium workload with virtualized row assertions', async () => {
    const setup = await setupGroupedWorkspace(MEDIUM_WORKLOAD)
    const open = await waitForPopupState(
      page,
      `open:${MEDIUM_WORKLOAD.name}`,
      (state) =>
        !state.loadingVisible &&
        state.windowCards > 0 &&
        state.groupHeaders > 0 &&
        state.tabRows > 0,
    )

    expect(open.state.windowCards).toBeLessThanOrEqual(setup.windowIds.length)
    expect(open.state.groupHeaders).toBeLessThan(setup.expectedGroupHeaders)
    expect(open.state.tabRows).toBeLessThan(setup.expectedTabRows)
  })

  test('measures grouped popup open for the large workload with virtualized row assertions', async () => {
    const setup = await setupGroupedWorkspace(LARGE_WORKLOAD)
    const open = await waitForPopupState(
      page,
      `open:${LARGE_WORKLOAD.name}`,
      (state) =>
        !state.loadingVisible &&
        state.windowCards > 0 &&
        state.groupHeaders > 0 &&
        state.tabRows > 0,
    )

    expect(open.state.windowCards).toBeLessThanOrEqual(setup.windowIds.length)
    expect(open.state.groupHeaders).toBeLessThan(setup.expectedGroupHeaders)
    expect(open.state.tabRows).toBeLessThan(setup.expectedTabRows)
  })

  test('narrows grouped search results to the exact matching tabs and group headers', async () => {
    const setup = await setupGroupedWorkspace(MEDIUM_WORKLOAD)
    await waitForPopupState(
      page,
      'open:search-benchmark',
      (state) =>
        !state.loadingVisible &&
        state.windowCards > 0 &&
        state.groupHeaders > 0 &&
        state.tabRows > 0,
    )

    const searchInput = page.locator(SEARCH_SELECTOR)
    await expect(searchInput).toBeVisible()
    await searchInput.click()
    await page.keyboard.type('needle-target', { delay: 10 })

    const search = await waitForPopupState(
      page,
      'search:medium',
      (state) =>
        state.searchValue === 'needle-target' &&
        state.groupHeaders === setup.expectedMatches &&
        state.tabRows === setup.expectedMatches,
    )

    expect(search.state.groupHeaders).toBe(setup.expectedMatches)
    expect(search.state.tabRows).toBe(setup.expectedMatches)
  })

  test('reveals offscreen rows during keyboard navigation without extra mouse-triggered scrolling', async () => {
    await setupGroupedWorkspace(LARGE_WORKLOAD)
    await waitForPopupState(
      page,
      'open:keyboard',
      (state) =>
        !state.loadingVisible &&
        state.windowCards > 0 &&
        state.groupHeaders > 0 &&
        state.tabRows > 0,
    )

    const scrollContainer = page.getByTestId('window-list-scroll-container')
    await expect(scrollContainer).toBeVisible()
    const initialScrollTop = await scrollContainer.evaluate(
      (node) => (node as HTMLDivElement).scrollTop,
    )

    await page.keyboard.press('j')
    const firstFocusedTestId = await page.evaluate(
      () => document.activeElement?.getAttribute('data-testid') || '',
    )
    expect(firstFocusedTestId).toMatch(
      /^(tab-row|tab-group-header|window-title)-/,
    )

    for (let index = 0; index < 49; index += 1) {
      await page.keyboard.press('j')
    }

    const finalFocusedTestId = await page.evaluate(
      () => document.activeElement?.getAttribute('data-testid') || '',
    )
    const keyboardScrollTop = await scrollContainer.evaluate(
      (node) => (node as HTMLDivElement).scrollTop,
    )

    expect(finalFocusedTestId).toMatch(
      /^(tab-row|tab-group-header|window-title)-/,
    )
    expect(finalFocusedTestId).not.toBe(firstFocusedTestId)
    expect(keyboardScrollTop).toBeGreaterThan(initialScrollTop)

    const visibleMouseTarget = await page.evaluate(() => {
      const container = document.querySelector(
        '[data-testid="window-list-scroll-container"]',
      )
      if (!(container instanceof HTMLDivElement)) {
        return null
      }
      const containerRect = container.getBoundingClientRect()
      const focusableRows = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-testid^="tab-row-"],[data-testid^="tab-group-header-"],[data-testid^="window-title-"]',
        ),
      )
      const target = focusableRows.find((node) => {
        const rect = node.getBoundingClientRect()
        return (
          rect.top >= containerRect.top + 24 &&
          rect.bottom <= containerRect.bottom - 24 &&
          rect.left >= containerRect.left &&
          rect.right <= containerRect.right
        )
      })
      if (!target) {
        return null
      }
      const rect = target.getBoundingClientRect()
      return {
        testId: target.getAttribute('data-testid') || '',
        x: rect.left + Math.min(rect.width / 2, Math.max(rect.width - 12, 12)),
        y: rect.top + rect.height / 2,
      }
    })
    expect(visibleMouseTarget).not.toBeNull()
    if (!visibleMouseTarget) {
      throw new Error('Failed to find a fully visible row for mouse click')
    }
    await page.mouse.click(visibleMouseTarget.x, visibleMouseTarget.y)
    const mouseScrollTop = await scrollContainer.evaluate(
      (node) => (node as HTMLDivElement).scrollTop,
    )
    expect(mouseScrollTop).toBe(keyboardScrollTop)
  })

  test('measures interaction costs for keyboard navigation and group selection on the large workload', async () => {
    const setup = await setupGroupedWorkspace(LARGE_WORKLOAD)
    await waitForPopupState(
      page,
      'open:interaction',
      (state) =>
        !state.loadingVisible &&
        state.windowCards > 0 &&
        state.groupHeaders > 0 &&
        state.tabRows > 0,
    )

    const scrollContainer = page.getByTestId('window-list-scroll-container')
    await expect(scrollContainer).toBeVisible()
    const initialKeyboardState = await readKeyboardBenchmarkState(page)

    const keyboard = await measureStateTransition({
      label: 'keyboard:50',
      action: async () => {
        for (let index = 0; index < 50; index += 1) {
          await page.keyboard.press('j')
        }
      },
      readState: async () => await readKeyboardBenchmarkState(page),
      predicate: (state) =>
        /^(tab-row|tab-group-header|window-title)-/.test(state.focusedTestId) &&
        state.scrollTop > initialKeyboardState.scrollTop,
    })

    expect(keyboard.state.focusedTestId).toMatch(
      /^(tab-row|tab-group-header|window-title)-/,
    )
    expect(keyboard.state.scrollTop).toBeGreaterThan(
      initialKeyboardState.scrollTop,
    )

    await page.reload()
    await page.locator(SEARCH_SELECTOR).waitFor({ timeout: 15000 })
    await waitForPopupState(
      page,
      'open:select-group',
      (state) =>
        !state.loadingVisible &&
        state.windowCards > 0 &&
        state.groupHeaders > 0 &&
        state.tabRows > 0,
    )

    const focusedGroupHeader = await focusByKeyboardUntil(page, (testId) =>
      testId.startsWith('tab-group-header-'),
    )
    expect(focusedGroupHeader).toBe(
      `tab-group-header-${setup.groupIdsByWindow[0][0]}`,
    )

    const groupSelection = await measureStateTransition({
      label: 'select:group',
      action: async () => {
        await page.keyboard.press('x')
      },
      readState: async () => await readSelectedCountState(page),
      predicate: (state) =>
        state.selectedCount === LARGE_WORKLOAD.groupSize &&
        state.focusedTestId === focusedGroupHeader,
    })

    expect(groupSelection.state.selectedCount).toBe(LARGE_WORKLOAD.groupSize)
  })

  test('measures same-window group move cost on the large workload', async () => {
    const dragWindowUrls = [
      Array.from({ length: LARGE_WORKLOAD.tabsPerWindow }, (_, tabIndex) =>
        buildDataUrl(`group-move-large-tab-${tabIndex}`),
      ),
    ]
    const [windowId] = await createWindowsWithTabs(page, dragWindowUrls)
    expect(windowId).toBeGreaterThan(-1)
    const sourceGroupId = await groupTabsInWindowWithRetry({
      page,
      windowId,
      urls: dragWindowUrls[0].slice(0, LARGE_WORKLOAD.groupSize),
      title: 'Move benchmark group',
      color: 'purple',
    })
    expect(sourceGroupId).toBeGreaterThan(-1)

    const targetTabId = await page.evaluate(
      async ({ windowId, targetUrl }) => {
        const tabs = await chrome.tabs.query({ windowId })
        return tabs.find((tab) => tab.url === targetUrl)?.id ?? -1
      },
      {
        windowId,
        targetUrl: dragWindowUrls[0][LARGE_WORKLOAD.groupSize + 4],
      },
    )
    expect(targetTabId).toBeGreaterThan(-1)

    await page.goto(extensionURL)
    await waitForTestId(page, `tab-group-header-${sourceGroupId}`)
    await waitForTestId(page, `tab-row-${targetTabId}`)
    await waitForPopupState(
      page,
      'open:group-move',
      (state) =>
        !state.loadingVisible &&
        state.windowCards > 0 &&
        state.groupHeaders > 0 &&
        state.tabRows > 0,
    )

    await page.getByTestId(`tab-group-header-${sourceGroupId}`).hover()
    await expect(
      page.getByTestId(`tab-group-drag-handle-${sourceGroupId}`),
    ).toBeVisible()

    const initialMoveState = await page.evaluate(
      async ({ windowId, sourceGroupId, targetTabId }) => {
        const tabs = (await chrome.tabs.query({ windowId })).sort(
          (a, b) => a.index - b.index,
        )
        const sourceTabs = tabs.filter((tab) => tab.groupId === sourceGroupId)
        const targetTab = tabs.find((tab) => tab.id === targetTabId)
        return {
          sourceStart: sourceTabs[0]?.index ?? -1,
          targetIndex: targetTab?.index ?? -1,
        }
      },
      { windowId, sourceGroupId, targetTabId },
    )
    const sourceBox = await page
      .getByTestId(`tab-group-drag-handle-${sourceGroupId}`)
      .boundingBox()
    const targetBox = await page
      .getByTestId(`tab-row-${targetTabId}`)
      .boundingBox()
    expect(sourceBox).not.toBeNull()
    expect(targetBox).not.toBeNull()
    if (!sourceBox || !targetBox) {
      throw new Error('Unable to resolve group move benchmark bounding boxes')
    }

    const groupMove = await measureStateTransition<GroupMoveState>({
      label: 'move:group',
      action: async () => {
        const sourceX = sourceBox.x + sourceBox.width / 2
        const sourceY = sourceBox.y + sourceBox.height / 2
        const targetX = targetBox.x + Math.min(16, targetBox.width / 2)
        const targetY = targetBox.y + targetBox.height * 0.75
        await page.mouse.move(sourceX, sourceY)
        await page.mouse.down()
        await page.mouse.move(targetX, targetY, { steps: 16 })
        await page.mouse.up()
      },
      readState: async () =>
        await page.evaluate(
          async ({ windowId, sourceGroupId, targetTabId }) => {
            const tabs = (await chrome.tabs.query({ windowId })).sort(
              (a, b) => a.index - b.index,
            )
            const groupTabs = tabs.filter(
              (tab) => tab.groupId === sourceGroupId,
            )
            const targetTab = tabs.find((tab) => tab.id === targetTabId)
            return {
              contiguous: groupTabs.every((tab, idx) => {
                if (idx === 0) {
                  return true
                }
                return tab.index === groupTabs[idx - 1].index + 1
              }),
              groupStart: groupTabs[0]?.index ?? -1,
              targetIndex: targetTab?.index ?? -1,
            }
          },
          { windowId, sourceGroupId, targetTabId },
        ),
      predicate: (state) =>
        state.contiguous &&
        state.groupStart > -1 &&
        state.targetIndex > -1 &&
        state.groupStart > initialMoveState.sourceStart,
    })

    expect(groupMove.state.contiguous).toBe(true)
    expect(groupMove.state.groupStart).not.toBe(initialMoveState.sourceStart)
    expect(groupMove.state.groupStart).toBeGreaterThan(-1)
  })

  test.fixme('verifies grouped cross-window drag moves the whole group to the target window', async () => {
    const dragWindowUrls = Array.from({ length: DRAG_WINDOW_COUNT }, (_, win) =>
      Array.from({ length: DRAG_TABS_PER_WINDOW }, (_, tab) =>
        buildDataUrl(`drag-window-${win}-tab-${tab}`),
      ),
    )
    const windowIds = await createWindowsWithTabs(page, dragWindowUrls)
    expect(windowIds).toHaveLength(DRAG_WINDOW_COUNT)
    expect(new Set(windowIds).size).toBe(DRAG_WINDOW_COUNT)

    const sourceWindowId = windowIds[0]
    const targetWindowId = windowIds[1]
    const sourceGroupId = await groupTabsInWindowWithRetry({
      page,
      windowId: sourceWindowId,
      urls: dragWindowUrls[0].slice(0, DRAG_GROUP_SIZE),
      title: 'Drag benchmark group',
      color: 'blue',
    })

    await page.goto(extensionURL)
    await waitForTestId(page, `tab-group-header-${sourceGroupId}`)
    await waitForTestId(page, `window-drop-zone-top-${targetWindowId}`)
    await waitForPopupState(
      page,
      'open:drag',
      (state) =>
        !state.loadingVisible &&
        state.groupHeaders >= 1 &&
        state.tabRows >= DRAG_WINDOW_COUNT * DRAG_TABS_PER_WINDOW,
    )

    const sourceMembers = await getGroupMembers(page, sourceGroupId)
    expect(sourceMembers.tabIds.length).toBe(DRAG_GROUP_SIZE)
    expect(sourceMembers.windowId).toBeGreaterThan(-1)
    expect(sourceMembers.windowId).not.toBe(targetWindowId)
    const actualSourceWindowId = sourceMembers.windowId

    await page.getByTestId(`tab-group-header-${sourceGroupId}`).hover()
    await expect(
      page.getByTestId(`tab-group-drag-handle-${sourceGroupId}`),
    ).toBeVisible()

    const startedAt = Date.now()
    await page
      .getByTestId(`tab-group-drag-handle-${sourceGroupId}`)
      .dragTo(page.getByTestId(`window-drop-zone-top-${targetWindowId}`))

    let movedGroupMembers = await getGroupMembers(page, sourceGroupId)
    await expect
      .poll(
        async () => {
          movedGroupMembers = await getGroupMembers(page, sourceGroupId)
          return (
            movedGroupMembers.windowId === targetWindowId &&
            movedGroupMembers.tabIds.length === DRAG_GROUP_SIZE
          )
        },
        { timeout: 10000 },
      )
      .toBe(true)

    console.log(
      '[performance-benchmark] drag:medium',
      JSON.stringify({
        elapsedMs: Date.now() - startedAt,
        groupId: sourceGroupId,
        sourceWindowId: actualSourceWindowId,
        targetWindowId,
        movedGroupMembers,
      }),
    )

    expect(movedGroupMembers.windowId).toBe(targetWindowId)
    expect(movedGroupMembers.tabIds).toHaveLength(DRAG_GROUP_SIZE)
  })
})
