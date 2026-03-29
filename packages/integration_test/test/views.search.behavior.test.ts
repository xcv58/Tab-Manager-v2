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
  waitForTestId,
} from '../util'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

const snapShotOptions = { maxDiffPixelRatio: 0.18, threshold: 0.2 }

type ActiveElementState = {
  testId: string
  ariaLabel: string
  tagName: string
  type: string
  rowTestId: string
}

const readActiveElementState = async (
  page: Page,
): Promise<ActiveElementState> =>
  await page.evaluate(() => {
    const node = document.activeElement as HTMLElement | null
    const row = node?.closest('[data-testid^="tab-row-"]')
    return {
      testId: node?.getAttribute('data-testid') || '',
      ariaLabel: node?.getAttribute('aria-label') || '',
      tagName: node?.tagName || '',
      type: node?.getAttribute('type') || '',
      rowTestId: row?.getAttribute('data-testid') || '',
    }
  })

const pressTabUntil = async (
  page: Page,
  predicate: (state: ActiveElementState) => boolean,
  { maxSteps = 40 }: { maxSteps?: number } = {},
) => {
  let state = await readActiveElementState(page)
  if (predicate(state)) {
    return state
  }

  for (let index = 0; index < maxSteps; index += 1) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(50)
    state = await readActiveElementState(page)
    if (predicate(state)) {
      return state
    }
  }

  throw new Error('Unable to focus requested control by Tab navigation')
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
      .locator('[role="option"]')
      .filter({ hasText: 'History' })
      .first()
    await expect(historyDivider).toBeVisible()
    const historyList = page.locator('[role="listbox"] ul').first()
    const historyListShot = await historyList.screenshot()
    expect(historyListShot).toMatchSnapshot('search-history-list-medium.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    await searchInput.fill('zzzz-no-results-state')
    await page.waitForTimeout(500)
    await expect(page.locator('[role="option"]')).toHaveCount(0)
    const noResultsInputShot = await searchInput.screenshot()
    expect(noResultsInputShot).toMatchSnapshot(
      'search-no-results-input-state.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
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
      .locator('[role="option"]')
      .filter({ hasText: 'Alpha Guide' })
      .first()
    await expect(groupMatchedOption).not.toContainText('SearchDocs')

    await searchInput.fill('Alpha Guide')
    await page.waitForTimeout(700)
    await expect(groupedHeader).toBeVisible()
    const titleMatchedOption = page
      .locator('[role="option"]')
      .filter({ hasText: 'Alpha Guide' })
      .first()
    await expect(titleMatchedOption).not.toContainText('SearchDocs')
    await titleMatchedOption.hover()
    await expect(
      page.getByRole('tooltip').filter({ hasText: 'Alpha Guide' }),
    ).toContainText('Group: SearchDocs')

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
      .locator('[role="option"]')
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

    const optionTexts = await page.locator('[role="option"]').allTextContents()
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
      .locator('[role="option"]')
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

  test('handoff focus from search to the tab workflow on Tab', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const searchInput = page.locator(
      'input[placeholder*="Search tabs or URLs"]',
    )
    await expect(searchInput).toBeVisible()
    await searchInput.click()
    await searchInput.fill('next')
    await page.waitForTimeout(700)
    await expect(page.getByRole('option').first()).toBeVisible()

    const firstVisibleRowTestId = await page.evaluate(() => {
      return (
        document
          .querySelector<HTMLElement>('[data-testid^="tab-row-"]')
          ?.getAttribute('data-testid') || ''
      )
    })
    expect(firstVisibleRowTestId).not.toBe('')

    await page.keyboard.press('Tab')
    await page.waitForTimeout(50)

    const firstTabState = await readActiveElementState(page)
    expect(firstTabState.tagName).not.toBe('BODY')

    const rowWorkflowState = await pressTabUntil(
      page,
      (state) =>
        state.ariaLabel === 'Toggle select' &&
        state.tagName === 'INPUT' &&
        state.type === 'checkbox',
      { maxSteps: 20 },
    )
    expect(rowWorkflowState).toMatchObject({
      ariaLabel: 'Toggle select',
      tagName: 'INPUT',
      type: 'checkbox',
      rowTestId: firstVisibleRowTestId,
    })
  })

  test('clear search and preserve subsequent keyboard navigation on Escape', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const searchInput = page.locator(
      'input[placeholder*="Search tabs or URLs"]',
    )
    await expect(searchInput).toBeVisible()
    await searchInput.click()
    await searchInput.fill('pin')
    await page.waitForTimeout(700)
    await expect(page.getByRole('option').first()).toBeVisible()

    const firstVisibleRowTestId = await page.evaluate(() => {
      return (
        document
          .querySelector<HTMLElement>('[data-testid^="tab-row-"]')
          ?.getAttribute('data-testid') || ''
      )
    })
    expect(firstVisibleRowTestId).not.toBe('')

    await searchInput.press('Escape')

    await expect(searchInput).toHaveValue('')
    await expect
      .poll(
        async () =>
          (await searchInput.getAttribute('aria-activedescendant')) || '',
      )
      .toBe('')

    const firstVisibleRowTestIdAfterEscape = await page.evaluate(() => {
      return (
        document
          .querySelector<HTMLElement>('[data-testid^="tab-row-"]')
          ?.getAttribute('data-testid') || ''
      )
    })
    expect(firstVisibleRowTestIdAfterEscape).not.toBe('')

    await page.keyboard.press('Tab')
    await page.waitForTimeout(50)
    expect((await readActiveElementState(page)).tagName).not.toBe('BODY')

    const rowWorkflowState = await pressTabUntil(
      page,
      (state) =>
        state.ariaLabel === 'Toggle select' &&
        state.tagName === 'INPUT' &&
        state.type === 'checkbox',
      { maxSteps: 20 },
    )
    expect(rowWorkflowState).toMatchObject({
      ariaLabel: 'Toggle select',
      tagName: 'INPUT',
      type: 'checkbox',
      rowTestId: firstVisibleRowTestIdAfterEscape,
    })
  })

  test('keep search open during non-option popup interaction', async () => {
    const urls = Array.from(
      { length: 22 },
      (_, index) =>
        `data:text/html,<title>Doc%20${index}</title><h1>Doc%20${index}</h1>`,
    )

    await openPages(browserContext, urls)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const searchInput = page.locator(
      'input[placeholder*="Search tabs or URLs"]',
    )
    await expect(searchInput).toBeVisible()
    await searchInput.click()
    await searchInput.fill('Doc')
    await page.waitForTimeout(700)

    const listbox = page.locator('[role="listbox"]')
    await expect(listbox).toBeVisible()

    const box = await listbox.boundingBox()
    if (!box) {
      throw new Error('Missing listbox bounds for popup interaction test')
    }

    await page.mouse.click(box.x + box.width / 2, box.y + 2)
    await page.waitForTimeout(300)

    await expect(searchInput).toBeFocused()
    await expect(searchInput).toHaveAttribute('aria-expanded', 'true')
    await expect(listbox).toBeVisible()
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
