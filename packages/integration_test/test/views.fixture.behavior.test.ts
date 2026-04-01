import { Page, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  StandardFixtureUrls,
  IntegrationFixtureServer,
  buildStandardFixtureUrls,
  CLOSE_PAGES,
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
  openPages,
  groupTabsByUrl,
  waitForDefaultExtensionView,
  waitForTestId,
  startIntegrationFixtureServer,
} from '../util'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string
let fixtureServer: IntegrationFixtureServer
let fixtureUrls: StandardFixtureUrls

type ActiveElementState = {
  testId: string
  ariaLabel: string
  role: string
  text: string
  tagName: string
  type: string
  checked: boolean | null
}

type CurrentWindowTabState = {
  id: number
  url: string
}

const readFocusedTestId = async (page: Page) =>
  await page.evaluate(
    () => document.activeElement?.getAttribute('data-testid') || '',
  )

const readFocusedRowTestId = async (page: Page) =>
  await page.evaluate(() => {
    const row = document.activeElement?.closest('[data-testid^="tab-row-"]')
    return row?.getAttribute('data-testid') || ''
  })

const readActiveElementState = async (
  page: Page,
): Promise<ActiveElementState> =>
  await page.evaluate(() => {
    const node = document.activeElement as
      | (HTMLElement & { checked?: boolean; type?: string })
      | null
    return {
      testId: node?.getAttribute('data-testid') || '',
      ariaLabel: node?.getAttribute('aria-label') || '',
      role: node?.getAttribute('role') || '',
      text: node?.textContent?.replace(/\s+/g, ' ').trim() || '',
      tagName: node?.tagName || '',
      type: node?.getAttribute('type') || '',
      checked:
        typeof node?.checked === 'boolean'
          ? Boolean(node.checked)
          : node?.getAttribute('aria-checked') === 'true'
            ? true
            : node?.getAttribute('aria-checked') === 'false'
              ? false
              : null,
    }
  })

const readSelectedCountState = async (page: Page) =>
  await page.evaluate(() => {
    const text =
      Array.from(document.querySelectorAll('p')).find((node) =>
        /selected/.test(node.textContent || ''),
      )?.textContent || ''
    const match = text.match(/,\s*(\d+)\s+tabs?\s+selected/i)
    return match ? Number(match[1]) : -1
  })

const getVisibleRowTabs = async (
  page: Page,
): Promise<CurrentWindowTabState[]> =>
  await page.evaluate(async () => {
    const rowIds = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid^="tab-row-"]'),
    )
      .map((node) => Number(node.dataset.testid?.replace('tab-row-', '')))
      .filter((id) => Number.isFinite(id) && id > -1)

    const tabs = await Promise.all(rowIds.map((id) => chrome.tabs.get(id)))
    return tabs.map((tab) => ({
      id: tab.id ?? -1,
      url: tab.url || '',
    }))
  })

const focusByKeyboardUntil = async (
  page: Page,
  predicate: (testId: string) => boolean,
  maxSteps = 40,
) => {
  let focusedTestId = await readFocusedTestId(page)
  if (predicate(focusedTestId)) {
    return focusedTestId
  }

  for (let index = 0; index < maxSteps; index += 1) {
    await page.keyboard.press('j')
    focusedTestId = await readFocusedTestId(page)
    if (predicate(focusedTestId)) {
      return focusedTestId
    }
  }

  throw new Error('Unable to focus requested row by keyboard navigation')
}

const pressTabUntil = async (
  page: Page,
  predicate: (state: ActiveElementState) => boolean,
  {
    maxSteps = 40,
    reverse = false,
  }: { maxSteps?: number; reverse?: boolean } = {},
) => {
  let state = await readActiveElementState(page)
  if (predicate(state)) {
    return state
  }

  for (let index = 0; index < maxSteps; index += 1) {
    await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab')
    await page.waitForTimeout(50)
    state = await readActiveElementState(page)
    if (predicate(state)) {
      return state
    }
  }

  throw new Error(
    `Unable to focus requested control by ${reverse ? 'Shift+Tab' : 'Tab'} navigation`,
  )
}

const pressTabAndReadState = async (
  page: Page,
  reverse = false,
): Promise<ActiveElementState> => {
  await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab')
  await page.waitForTimeout(50)
  return readActiveElementState(page)
}

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

  test('support keyboard-only focus and selection for inner tab controls', async () => {
    await openPages(browserContext, fixtureUrls.all)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const targetTabId = await page.evaluate(async (url) => {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      return tabs.find((tab) => tab.url === url)?.id ?? -1
    }, fixtureUrls.nextjs)

    expect(targetTabId).toBeGreaterThan(-1)
    await waitForTestId(page, `tab-row-${targetTabId}`)
    await expect.poll(() => readSelectedCountState(page)).toBe(0)

    await focusByKeyboardUntil(
      page,
      (testId) => testId === `tab-row-${targetTabId}`,
      60,
    )

    const selectionToggle = await pressTabUntil(
      page,
      (state) =>
        state.ariaLabel === 'Toggle select' &&
        state.tagName === 'INPUT' &&
        state.type === 'checkbox',
      { maxSteps: 8 },
    )
    expect(selectionToggle.checked).toBe(false)

    await page.keyboard.press('Space')

    await expect.poll(() => readSelectedCountState(page)).toBe(1)
    await expect
      .poll(() => readFocusedTestId(page))
      .toBe(`tab-row-${targetTabId}`)
  })

  test('tab through a focused row in checkbox-menu-close order', async () => {
    await openPages(browserContext, fixtureUrls.all)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const { targetTabId } = await page.evaluate(async (url) => {
      const tabs = (await chrome.tabs.query({ currentWindow: true })).sort(
        (a, b) => (a.index ?? 0) - (b.index ?? 0),
      )
      const targetIndex = tabs.findIndex((tab) => tab.url === url)
      return {
        targetTabId: tabs[targetIndex]?.id ?? -1,
      }
    }, fixtureUrls.nextjs)

    expect(targetTabId).toBeGreaterThan(-1)

    await waitForTestId(page, `tab-row-${targetTabId}`)
    await focusByKeyboardUntil(
      page,
      (testId) => testId === `tab-row-${targetTabId}`,
      60,
    )

    await expect
      .poll(() => readFocusedTestId(page))
      .toBe(`tab-row-${targetTabId}`)

    const checkboxState = await pressTabAndReadState(page)
    expect(checkboxState).toMatchObject({
      ariaLabel: 'Toggle select',
      tagName: 'INPUT',
      type: 'checkbox',
    })

    const menuState = await pressTabAndReadState(page)
    expect(menuState).toMatchObject({
      ariaLabel: 'Tab actions',
      tagName: 'BUTTON',
      testId: `tab-menu-${targetTabId}`,
    })

    const closeState = await pressTabAndReadState(page)
    expect(closeState).toMatchObject({
      ariaLabel: 'Close',
      tagName: 'BUTTON',
    })

    const nextCheckboxState = await pressTabAndReadState(page)
    expect(nextCheckboxState).toMatchObject({
      ariaLabel: 'Toggle select',
      tagName: 'INPUT',
      type: 'checkbox',
    })
  })

  test('support keyboard-only tab closing from the row close button', async () => {
    await openPages(browserContext, fixtureUrls.all)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const targetTabId = await page.evaluate(async (url) => {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      return tabs.find((tab) => tab.url === url)?.id ?? -1
    }, fixtureUrls.nextjs)

    expect(targetTabId).toBeGreaterThan(-1)
    await waitForTestId(page, `tab-row-${targetTabId}`)

    await focusByKeyboardUntil(
      page,
      (testId) => testId === `tab-row-${targetTabId}`,
      60,
    )

    const checkboxState = await pressTabAndReadState(page)
    expect(checkboxState).toMatchObject({
      ariaLabel: 'Toggle select',
      tagName: 'INPUT',
      type: 'checkbox',
    })

    const menuState = await pressTabAndReadState(page)
    expect(menuState).toMatchObject({
      ariaLabel: 'Tab actions',
      tagName: 'BUTTON',
      testId: `tab-menu-${targetTabId}`,
    })

    const closeState = await pressTabAndReadState(page)
    expect(closeState).toMatchObject({
      ariaLabel: 'Close',
      tagName: 'BUTTON',
    })
    await page.keyboard.press('Space')

    await expect(page.getByTestId(`tab-row-${targetTabId}`)).toHaveCount(0)
    await expect
      .poll(async () => {
        return await page.evaluate(async (tabId) => {
          const tabs = await chrome.tabs.query({ currentWindow: true })
          return tabs.some((tab) => tab.id === tabId)
        }, targetTabId)
      })
      .toBe(false)
  })

  test('restore focus to the next row after keyboard-only close', async () => {
    await openPages(browserContext, fixtureUrls.all)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const orderedTabs = await getVisibleRowTabs(page)
    const targetIndex = orderedTabs.findIndex(
      (tab) => tab.url === fixtureUrls.nextjs,
    )
    const targetTabId = orderedTabs[targetIndex]?.id ?? -1
    const nextTabId = orderedTabs[targetIndex + 1]?.id ?? -1

    expect(targetIndex).toBeGreaterThan(-1)
    expect(targetTabId).toBeGreaterThan(-1)
    expect(nextTabId).toBeGreaterThan(-1)

    await waitForTestId(page, `tab-row-${targetTabId}`)
    await focusByKeyboardUntil(
      page,
      (testId) => testId === `tab-row-${targetTabId}`,
      60,
    )

    await pressTabAndReadState(page)
    await pressTabAndReadState(page)
    const closeState = await pressTabAndReadState(page)
    expect(closeState).toMatchObject({
      ariaLabel: 'Close',
      tagName: 'BUTTON',
    })
    await page.keyboard.press('Space')

    await expect(page.getByTestId(`tab-row-${targetTabId}`)).toHaveCount(0)
    await expect
      .poll(async () => {
        return await page.evaluate(async (tabId) => {
          const tabs = await chrome.tabs.query({ currentWindow: true })
          return tabs.some((tab) => tab.id === tabId)
        }, targetTabId)
      })
      .toBe(false)
    await expect
      .poll(() => readFocusedRowTestId(page))
      .toBe(`tab-row-${nextTabId}`)
  })

  test('restore focus to the previous row when closing the last row by keyboard', async () => {
    await openPages(browserContext, fixtureUrls.all)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const orderedTabs = await getVisibleRowTabs(page)
    const targetIndex = orderedTabs.findIndex(
      (tab) => tab.url === fixtureUrls.opsClass,
    )
    const targetTabId = orderedTabs[targetIndex]?.id ?? -1
    const previousTabId = orderedTabs[targetIndex - 1]?.id ?? -1

    expect(targetIndex).toBeGreaterThan(0)
    expect(targetTabId).toBeGreaterThan(-1)
    expect(previousTabId).toBeGreaterThan(-1)

    await waitForTestId(page, `tab-row-${targetTabId}`)
    await focusByKeyboardUntil(
      page,
      (testId) => testId === `tab-row-${targetTabId}`,
      60,
    )

    await pressTabAndReadState(page)
    await pressTabAndReadState(page)
    const closeState = await pressTabAndReadState(page)
    expect(closeState).toMatchObject({
      ariaLabel: 'Close',
      tagName: 'BUTTON',
    })

    await page.keyboard.press('Space')

    await expect(page.getByTestId(`tab-row-${targetTabId}`)).toHaveCount(0)
    await expect
      .poll(async () => {
        return await page.evaluate(async (tabId) => {
          const tabs = await chrome.tabs.query({ currentWindow: true })
          return tabs.some((tab) => tab.id === tabId)
        }, targetTabId)
      })
      .toBe(false)
    await expect
      .poll(() => readFocusedRowTestId(page))
      .toBe(`tab-row-${previousTabId}`)
  })

  test('restore focus to another column when keyboard-closing the final row in a column', async () => {
    const targetUrl = `${fixtureServer.baseUrl}/cross-column-target?title=${encodeURIComponent(
      'Cross Column Target',
    )}`
    const fallbackUrl = `${fixtureServer.baseUrl}/cross-column-fallback?title=${encodeURIComponent(
      'Cross Column Fallback',
    )}`

    await page.evaluate(async () => {
      await chrome.storage.sync.set({
        autoFitColumns: true,
      })
    })
    await page.reload()
    await waitForDefaultExtensionView(page)

    const setup = await page.evaluate(
      async ({ targetUrl, fallbackUrl }) => {
        const createWindowWithUrl = async (url: string) => {
          const win = await chrome.windows.create({
            url,
            focused: false,
          })
          const windowId = win.id ?? -1
          if (windowId === -1) {
            return { windowId, tabId: -1 }
          }
          const tabs = await chrome.tabs.query({ windowId })
          const tabId = tabs[0]?.id ?? -1
          return { windowId, tabId }
        }

        return {
          target: await createWindowWithUrl(targetUrl),
          fallback: await createWindowWithUrl(fallbackUrl),
        }
      },
      { targetUrl, fallbackUrl },
    )

    expect(setup.target.tabId).toBeGreaterThan(-1)
    expect(setup.fallback.tabId).toBeGreaterThan(-1)

    await page.reload()
    await page.bringToFront()
    await waitForTestId(page, `tab-row-${setup.target.tabId}`)
    await waitForTestId(page, `tab-row-${setup.fallback.tabId}`)

    const rowPositions = await page.evaluate(
      ({ targetTabId, fallbackTabId }) => {
        const getLeft = (tabId: number) =>
          document
            .querySelector<HTMLElement>(`[data-testid="tab-row-${tabId}"]`)
            ?.getBoundingClientRect().left ?? -1

        return {
          targetLeft: getLeft(targetTabId),
          fallbackLeft: getLeft(fallbackTabId),
        }
      },
      {
        targetTabId: setup.target.tabId,
        fallbackTabId: setup.fallback.tabId,
      },
    )

    expect(rowPositions.targetLeft).toBeGreaterThan(-1)
    expect(rowPositions.fallbackLeft).toBeGreaterThan(-1)
    expect(rowPositions.targetLeft).not.toBe(rowPositions.fallbackLeft)

    await focusByKeyboardUntil(
      page,
      (testId) => testId.startsWith('tab-row-'),
      60,
    )
    const initiallyFocusedRow = await readFocusedRowTestId(page)
    if (initiallyFocusedRow !== `tab-row-${setup.target.tabId}`) {
      const currentLeft = await page.evaluate(() => {
        const row = document.activeElement?.closest('[data-testid^="tab-row-"]')
        return row?.getBoundingClientRect().left ?? -1
      })

      await page.keyboard.press(
        currentLeft < rowPositions.targetLeft ? 'l' : 'h',
      )
      await expect
        .poll(() => readFocusedRowTestId(page))
        .toBe(`tab-row-${setup.target.tabId}`)
    }

    await pressTabAndReadState(page)
    await pressTabAndReadState(page)
    const closeState = await pressTabAndReadState(page)
    expect(closeState).toMatchObject({
      ariaLabel: 'Close',
      tagName: 'BUTTON',
    })

    await page.keyboard.press('Space')

    await expect(page.getByTestId(`tab-row-${setup.target.tabId}`)).toHaveCount(
      0,
    )
    await expect
      .poll(() => readFocusedRowTestId(page))
      .toBe(`tab-row-${setup.fallback.tabId}`)
  })

  test('support keyboard-only tab menu navigation, activation, and focus restore', async () => {
    await openPages(browserContext, fixtureUrls.all)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const targetTabId = await page.evaluate(async (url) => {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      return tabs.find((tab) => tab.url === url)?.id ?? -1
    }, fixtureUrls.pinboard)

    expect(targetTabId).toBeGreaterThan(-1)
    await waitForTestId(page, `tab-row-${targetTabId}`)
    await expect.poll(() => readSelectedCountState(page)).toBe(0)

    await focusByKeyboardUntil(
      page,
      (testId) => testId === `tab-row-${targetTabId}`,
      60,
    )
    await pressTabUntil(
      page,
      (state) =>
        state.ariaLabel === 'Tab actions' && state.tagName === 'BUTTON',
      { maxSteps: 20 },
    )

    await page.keyboard.press('Space')
    await expect(page.getByRole('menu')).toHaveCount(1)
    await expect
      .poll(() => readActiveElementState(page))
      .toMatchObject({
        role: 'menuitem',
        text: 'Pin tab',
      })

    await page.keyboard.press('ArrowDown')
    await expect
      .poll(() => readActiveElementState(page))
      .toMatchObject({
        role: 'menuitem',
        text: 'Close',
      })

    await page.keyboard.press('Tab')
    await expect
      .poll(() => readActiveElementState(page))
      .toMatchObject({
        role: 'menuitem',
        text: 'Close other tabs',
      })

    await page.keyboard.press('Shift+Tab')
    await expect
      .poll(() => readActiveElementState(page))
      .toMatchObject({
        role: 'menuitem',
        text: 'Close',
      })

    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect
      .poll(() => readActiveElementState(page))
      .toMatchObject({
        ariaLabel: 'Tab actions',
        tagName: 'BUTTON',
      })

    await page.keyboard.press('Space')
    await expect(page.getByRole('menu')).toHaveCount(1)
    await expect
      .poll(() => readActiveElementState(page))
      .toMatchObject({
        role: 'menuitem',
        text: 'Pin tab',
      })

    await page.keyboard.press('Space')

    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect
      .poll(async () => {
        return await page.evaluate(async (tabId) => {
          const tab = await chrome.tabs.get(tabId)
          return Boolean(tab.pinned)
        }, targetTabId)
      })
      .toBe(true)
    await expect.poll(() => readSelectedCountState(page)).toBe(0)
    await expect
      .poll(() => readActiveElementState(page))
      .toMatchObject({
        ariaLabel: 'Tab actions',
        tagName: 'BUTTON',
      })
  })

  test('move same-domain ungrouped tabs to this window from the tab menu', async () => {
    const targetUrl = `${fixtureServer.baseUrl}/same-domain-target?title=${encodeURIComponent(
      'Same Domain Target',
    )}`
    const sourceUrl = `${fixtureServer.baseUrl}/same-domain-source?title=${encodeURIComponent(
      'Same Domain Source',
    )}`

    const setup = await page.evaluate(
      async ({ targetUrl, sourceUrl }) => {
        const createWindowWithUrl = async (url: string) => {
          const win = await chrome.windows.create({
            url,
            focused: false,
          })
          const windowId = win.id ?? -1
          const tabs =
            windowId === -1 ? [] : await chrome.tabs.query({ windowId })
          return {
            windowId,
            tabId: tabs[0]?.id ?? -1,
          }
        }

        return {
          target: await createWindowWithUrl(targetUrl),
          source: await createWindowWithUrl(sourceUrl),
        }
      },
      { targetUrl, sourceUrl },
    )

    expect(setup.target.windowId).toBeGreaterThan(-1)
    expect(setup.source.windowId).toBeGreaterThan(-1)
    expect(setup.target.tabId).toBeGreaterThan(-1)
    expect(setup.source.tabId).toBeGreaterThan(-1)

    await page.reload()
    await waitForTestId(page, `tab-row-${setup.target.tabId}`)
    await waitForTestId(page, `tab-row-${setup.source.tabId}`)

    const targetRow = page.getByTestId(`tab-row-${setup.target.tabId}`)
    await targetRow.hover()

    const targetMenuButton = page.getByTestId(`tab-menu-${setup.target.tabId}`)
    await expect(targetMenuButton).toBeVisible()
    await targetMenuButton.click({ force: true })

    const sameDomainAction = page.getByRole('menuitem', {
      name: 'Cluster 2 same domain ungrouped tabs to this window',
    })
    await expect(sameDomainAction).toBeVisible()
    await sameDomainAction.click()

    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect
      .poll(async () => {
        return await page.evaluate(
          async ({ targetWindowId, sourceTabId, targetUrl, sourceUrl }) => {
            const sourceTab = await chrome.tabs.get(sourceTabId)
            const movedToTargetWindow = sourceTab.windowId === targetWindowId
            const targetWindowDomainTabs = await chrome.tabs.query({
              windowId: targetWindowId,
            })

            return {
              movedToTargetWindow,
              targetWindowDomainTabCount: targetWindowDomainTabs.filter((tab) =>
                [targetUrl, sourceUrl].includes(tab.url || ''),
              ).length,
            }
          },
          {
            targetWindowId: setup.target.windowId,
            sourceTabId: setup.source.tabId,
            targetUrl,
            sourceUrl,
          },
        )
      })
      .toMatchObject({
        movedToTargetWindow: true,
        targetWindowDomainTabCount: 2,
      })
  })

  test('support keyboard-only closing from the tab menu close action', async () => {
    await openPages(browserContext, fixtureUrls.all)
    await page.bringToFront()
    await page.waitForTimeout(800)

    const orderedTabs = await getVisibleRowTabs(page)
    const targetIndex = orderedTabs.findIndex(
      (tab) => tab.url === fixtureUrls.pinboard,
    )
    const targetTabId = orderedTabs[targetIndex]?.id ?? -1
    const fallbackFocusTabId =
      orderedTabs[targetIndex + 1]?.id ?? orderedTabs[targetIndex - 1]?.id ?? -1

    expect(targetIndex).toBeGreaterThan(-1)
    expect(targetTabId).toBeGreaterThan(-1)
    expect(fallbackFocusTabId).toBeGreaterThan(-1)

    await waitForTestId(page, `tab-row-${targetTabId}`)
    await focusByKeyboardUntil(
      page,
      (testId) => testId === `tab-row-${targetTabId}`,
      60,
    )
    await pressTabUntil(
      page,
      (state) =>
        state.ariaLabel === 'Tab actions' &&
        state.tagName === 'BUTTON' &&
        state.testId === `tab-menu-${targetTabId}`,
      { maxSteps: 20 },
    )

    await page.keyboard.press('Space')
    await expect(page.getByRole('menu')).toHaveCount(1)
    await page.keyboard.press('ArrowDown')
    await expect
      .poll(() => readActiveElementState(page))
      .toMatchObject({
        role: 'menuitem',
        text: 'Close',
      })

    await page.keyboard.press('Space')

    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(page.getByTestId(`tab-row-${targetTabId}`)).toHaveCount(0)
    await expect
      .poll(async () => {
        return await page.evaluate(async (tabId) => {
          const tabs = await chrome.tabs.query({ currentWindow: true })
          return tabs.some((tab) => tab.id === tabId)
        }, targetTabId)
      })
      .toBe(false)
    await expect
      .poll(() => readFocusedRowTestId(page))
      .toBe(`tab-row-${fallbackFocusTabId}`)
  })
})
