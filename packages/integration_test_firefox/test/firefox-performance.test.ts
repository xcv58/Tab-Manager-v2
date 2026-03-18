import { WebDriver } from 'selenium-webdriver'
import {
  SEARCH_INPUT_SELECTOR,
  FirefoxExtensionSession,
  clearExtensionStorage,
  closeBrowserWithExtension,
  closeNonExtensionTabs,
  createWindowsWithTabs,
  executeInExtension,
  groupTabsByUrl,
  initBrowserWithExtension,
  waitForCss,
} from '../util'

const WINDOW_COUNT = 4
const TABS_PER_WINDOW = process.env.CI ? 40 : 50
const GROUP_SIZE = 10
const MATCH_EVERY = 25
const GROUP_COLORS = [
  'blue',
  'green',
  'yellow',
  'pink',
  'purple',
  'cyan',
  'orange',
  'red',
  'grey',
] as const

type PopupState = {
  windowCards: number
  tabRows: number
  groupHeaders: number
  loadingVisible: boolean
  searchValue: string
}

type KeyboardState = {
  focusedTestId: string
  scrollTop: number
}

type SelectedCountState = {
  focusedTestId: string
  selectedCount: number
}

const describeFirefox =
  process.env.FIREFOX_E2E === '1' ? describe : describe.skip

const uniqueUrl = (windowIndex: number, tabIndex: number) => {
  const slug = tabIndex % MATCH_EVERY === 0 ? 'needle-target' : 'baseline'
  return `https://example.com/?tab-manager-v2-firefox-perf=window-${windowIndex}-tab-${tabIndex}-${slug}`
}

const buildGroupedWorkloadUrls = () =>
  Array.from({ length: WINDOW_COUNT }, (_, windowIndex) =>
    Array.from({ length: TABS_PER_WINDOW }, (_, tabIndex) =>
      uniqueUrl(windowIndex, tabIndex),
    ),
  )

const expectedMatchCount =
  WINDOW_COUNT * Math.ceil(TABS_PER_WINDOW / MATCH_EVERY)

const logFirefoxPerformance = (
  label: string,
  state: unknown,
  elapsedMs: number,
) =>
  console.log(
    `[firefox-performance] ${label}`,
    JSON.stringify({ elapsedMs, state }),
  )

const readPopupState = async (driver: WebDriver): Promise<PopupState> => {
  return await driver.executeScript(() => {
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
        (
          document.querySelector(
            'input[placeholder*="Search"]',
          ) as HTMLInputElement | null
        )?.value || '',
    }
  })
}

const readKeyboardState = async (driver: WebDriver): Promise<KeyboardState> => {
  return await driver.executeScript(() => {
    const container = document.querySelector(
      '[data-testid="window-list-scroll-container"]',
    )
    return {
      focusedTestId: document.activeElement?.getAttribute('data-testid') || '',
      scrollTop: container instanceof HTMLDivElement ? container.scrollTop : -1,
    }
  })
}

const readSelectedCountState = async (
  driver: WebDriver,
): Promise<SelectedCountState> => {
  return await driver.executeScript(() => {
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
}

const waitForPopupState = async (
  driver: WebDriver,
  label: string,
  predicate: (state: PopupState) => boolean,
  timeout = 45000,
) => {
  const startedAt = Date.now()
  let latestState = await readPopupState(driver)
  await driver.wait(async () => {
    latestState = await readPopupState(driver)
    return predicate(latestState)
  }, timeout)
  const elapsedMs = Date.now() - startedAt
  logFirefoxPerformance(label, latestState, elapsedMs)
  return latestState
}

const measureStateTransition = async <T>({
  driver,
  label,
  action,
  readState,
  predicate,
  timeout = 45000,
}: {
  driver: WebDriver
  label: string
  action: () => Promise<void>
  readState: () => Promise<T>
  predicate: (state: T) => boolean
  timeout?: number
}) => {
  const startedAt = Date.now()
  let latestState = await readState()
  await action()
  await driver.wait(async () => {
    latestState = await readState()
    return predicate(latestState)
  }, timeout)
  const elapsedMs = Date.now() - startedAt
  logFirefoxPerformance(label, latestState, elapsedMs)
  return latestState
}

const pressKey = async (driver: WebDriver, key: string, count = 1) => {
  for (let index = 0; index < count; index += 1) {
    await driver.actions().sendKeys(key).perform()
  }
}

const focusByKeyboardUntil = async (
  driver: WebDriver,
  predicate: (testId: string) => boolean,
  maxSteps = 80,
) => {
  for (let index = 0; index < maxSteps; index += 1) {
    await pressKey(driver, 'j')
    const state = await readKeyboardState(driver)
    if (predicate(state.focusedTestId)) {
      return state.focusedTestId
    }
  }
  throw new Error('Unable to focus requested row by keyboard navigation')
}

const configureBenchmarkSettings = async (driver: WebDriver) => {
  const settings = {
    showUnmatchedTab: false,
    preserveSearch: false,
    searchHistory: false,
    showUrl: true,
  }
  await executeInExtension(
    driver,
    async (nextSettings) => {
      await browser.storage.local.set(nextSettings)
      await browser.storage.sync.set(nextSettings)
    },
    settings,
  )
}

const resetExtensionState = async ({
  driver,
  extensionOrigin,
  extensionURL,
}: Pick<
  FirefoxExtensionSession,
  'driver' | 'extensionOrigin' | 'extensionURL'
>) => {
  await driver.get(extensionURL)
  await clearExtensionStorage(driver)
  await closeNonExtensionTabs(driver, extensionOrigin)
  await driver.get(extensionURL)
  await waitForCss(driver, SEARCH_INPUT_SELECTOR)
}

const setupGroupedWorkspace = async (
  driver: WebDriver,
  extensionURL: string,
) => {
  await configureBenchmarkSettings(driver)
  const workloadUrls = buildGroupedWorkloadUrls()
  const windowIds = await createWindowsWithTabs(driver, workloadUrls)

  expect(windowIds).toHaveLength(WINDOW_COUNT)
  expect(new Set(windowIds).size).toBe(WINDOW_COUNT)

  for (
    let windowIndex = 0;
    windowIndex < workloadUrls.length;
    windowIndex += 1
  ) {
    const windowId = windowIds[windowIndex]
    const urls = workloadUrls[windowIndex]
    for (
      let groupStart = 0;
      groupStart < urls.length;
      groupStart += GROUP_SIZE
    ) {
      const groupUrls = urls.slice(groupStart, groupStart + GROUP_SIZE)
      const groupId = await groupTabsByUrl(driver, {
        windowId,
        urls: groupUrls,
        title: `Firefox perf ${windowIndex}-${groupStart / GROUP_SIZE}`,
        color:
          GROUP_COLORS[
            (windowIndex + Math.floor(groupStart / GROUP_SIZE)) %
              GROUP_COLORS.length
          ],
      })
      expect(groupId).toBeGreaterThan(-1)
    }
  }

  await driver.get(extensionURL)
}

describeFirefox('Firefox performance scenarios', () => {
  let session: FirefoxExtensionSession
  let driver: WebDriver
  let extensionURL: string

  beforeAll(async () => {
    session = await initBrowserWithExtension()
    driver = session.driver
    extensionURL = session.extensionURL
  })

  afterAll(async () => {
    if (session) {
      await closeBrowserWithExtension(session)
    }
  })

  beforeEach(async () => {
    await resetExtensionState(session)
  })

  it('opens the medium grouped workload and renders popup content', async () => {
    await setupGroupedWorkspace(driver, extensionURL)

    const state = await waitForPopupState(
      driver,
      'open:medium',
      (popupState) =>
        !popupState.loadingVisible &&
        popupState.windowCards > 0 &&
        popupState.groupHeaders > 0 &&
        popupState.tabRows > 0 &&
        popupState.searchValue === '',
    )

    expect(state.windowCards).toBeGreaterThan(0)
    expect(state.groupHeaders).toBeGreaterThan(0)
    expect(state.tabRows).toBeGreaterThan(0)
  })

  it('narrows grouped search results to the exact matching tabs and group headers', async () => {
    await setupGroupedWorkspace(driver, extensionURL)
    await waitForPopupState(
      driver,
      'open:search-benchmark',
      (popupState) =>
        !popupState.loadingVisible &&
        popupState.windowCards > 0 &&
        popupState.groupHeaders > 0 &&
        popupState.tabRows > 0,
    )

    const searchInput = await waitForCss(driver, SEARCH_INPUT_SELECTOR)
    await searchInput.click()
    await searchInput.clear()
    await searchInput.sendKeys('needle-target')

    const state = await waitForPopupState(
      driver,
      'search:medium',
      (popupState) =>
        popupState.searchValue === 'needle-target' &&
        popupState.groupHeaders === expectedMatchCount &&
        popupState.tabRows === expectedMatchCount,
    )

    expect(state.groupHeaders).toBe(expectedMatchCount)
    expect(state.tabRows).toBe(expectedMatchCount)
  })

  it('reveals offscreen rows during keyboard navigation', async () => {
    await setupGroupedWorkspace(driver, extensionURL)
    await waitForPopupState(
      driver,
      'open:keyboard',
      (popupState) =>
        !popupState.loadingVisible &&
        popupState.windowCards > 0 &&
        popupState.groupHeaders > 0 &&
        popupState.tabRows > 0,
    )

    const initialState = await readKeyboardState(driver)
    const finalState = await measureStateTransition({
      driver,
      label: 'keyboard:50',
      action: async () => {
        await pressKey(driver, 'j', 50)
      },
      readState: async () => await readKeyboardState(driver),
      predicate: (state) =>
        /^(tab-row|tab-group-header|window-title)-/.test(state.focusedTestId) &&
        state.scrollTop > initialState.scrollTop,
    })

    expect(finalState.focusedTestId).toMatch(
      /^(tab-row|tab-group-header|window-title)-/,
    )
    expect(finalState.scrollTop).toBeGreaterThan(initialState.scrollTop)
  })

  it('selects a whole group after keyboard focus lands on a group header', async () => {
    await setupGroupedWorkspace(driver, extensionURL)
    await waitForPopupState(
      driver,
      'open:select-group',
      (popupState) =>
        !popupState.loadingVisible &&
        popupState.windowCards > 0 &&
        popupState.groupHeaders > 0 &&
        popupState.tabRows > 0,
    )

    const focusedGroupHeader = await focusByKeyboardUntil(
      driver,
      (testId) => testId.startsWith('tab-group-header-'),
      120,
    )
    const selectedState = await measureStateTransition({
      driver,
      label: 'select:group',
      action: async () => {
        await pressKey(driver, 'x')
      },
      readState: async () => await readSelectedCountState(driver),
      predicate: (state) =>
        state.selectedCount === GROUP_SIZE &&
        state.focusedTestId === focusedGroupHeader,
    })

    expect(selectedState.selectedCount).toBe(GROUP_SIZE)
    expect(selectedState.focusedTestId).toBe(focusedGroupHeader)
  })
})
