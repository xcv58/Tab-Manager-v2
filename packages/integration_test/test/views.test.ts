import { Page, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  TAB_QUERY,
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
    const wins = await page.$$('.shadow-2xl,.shadow-sm')
    expect(wins).toHaveLength(1)
    await page.reload()
    let tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(1)

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
    const wins = await page.$$('.shadow-2xl,.shadow-sm')
    expect(wins).toHaveLength(1)
    const tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(1)
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

  test('group header menu should move group to top and bottom deterministically', async () => {
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
      title: 'Move Group',
      color: 'yellow',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(700)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    const getBounds = async () => {
      return page.evaluate(async (groupId) => {
        const tabs = (
          await chrome.tabs.query({
            currentWindow: true,
          })
        ).sort((a, b) => a.index - b.index)
        const nonExtensionTabs = tabs.filter(
          (tab) => !(tab.url || '').startsWith('chrome-extension://'),
        )
        const groupTabs = tabs.filter((tab) => tab.groupId === groupId)
        return {
          minIndex: nonExtensionTabs[0]?.index ?? -1,
          maxIndex: nonExtensionTabs[nonExtensionTabs.length - 1]?.index ?? -1,
          groupStart: groupTabs[0]?.index ?? -1,
          groupEnd: groupTabs[groupTabs.length - 1]?.index ?? -1,
        }
      }, groupId)
    }

    await page.getByTestId(`tab-group-menu-${groupId}`).click()
    await page.getByTestId(`tab-group-menu-move-top-${groupId}`).click()
    await page.waitForTimeout(700)
    let bounds = await getBounds()
    expect(bounds.groupStart).toBe(bounds.minIndex)

    await page.getByTestId(`tab-group-menu-${groupId}`).click()
    await page.getByTestId(`tab-group-menu-move-bottom-${groupId}`).click()
    await page.waitForTimeout(700)
    bounds = await getBounds()
    expect(bounds.groupEnd).toBe(bounds.maxIndex)
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
    const wins = await page.$$('.shadow-2xl,.shadow-sm')
    expect(wins).toHaveLength(1)
    const tabs = await page.$$(TAB_QUERY)
    expect(tabs).toHaveLength(1)
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
