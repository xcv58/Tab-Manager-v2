import { Page, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  TAB_QUERY,
  URLS,
  isExtensionURL,
  CLOSE_PAGES,
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
  openPages,
  matchImageSnapshotOptions,
  groupTabsByUrl,
  getGroupMembers,
  updateTabGroup,
  ungroupTabGroupById,
  waitForTestId,
  waitForDefaultExtensionView,
} from '../util'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

const MULTI_WINDOW_URLS = {
  win1: [
    'about:blank#w1-group-a',
    'about:blank#w1-group-b',
    'about:blank#w1-free',
  ],
  win2: [
    'about:blank#w2-group-a',
    'about:blank#w2-group-b',
    'about:blank#w2-free',
  ],
}

const MIXED_GROUP_URLS = {
  alpha: ['about:blank#mixed-alpha-1', 'about:blank#mixed-alpha-2'],
  beta: ['about:blank#mixed-beta-1', 'about:blank#mixed-beta-2'],
  gamma: ['about:blank#mixed-gamma-1', 'about:blank#mixed-gamma-2'],
  free: ['about:blank#mixed-free-1', 'about:blank#mixed-free-2'],
}

const LIGHTWEIGHT_URLS = Array.from(
  { length: 6 },
  (_, index) => `about:blank#interaction-lightweight-${index}`,
)

const setupMultiWindowGroups = async (page: Page) => {
  const setup = await page.evaluate(
    async ({ win1Urls, win2Urls }) => {
      const getTabIdByUrl = async (windowId: number, url: string) => {
        const tabs = await chrome.tabs.query({ windowId })
        const tab = tabs.find((item) => item.url === url)
        return tab?.id ?? -1
      }

      const win1 = await chrome.windows.create({
        url: win1Urls[0],
        focused: false,
      })
      const win1Id = win1.id
      if (typeof win1Id !== 'number') {
        return null
      }
      await chrome.tabs.create({
        windowId: win1Id,
        url: win1Urls[1],
        active: false,
      })
      await chrome.tabs.create({
        windowId: win1Id,
        url: win1Urls[2],
        active: false,
      })

      const win2 = await chrome.windows.create({
        url: win2Urls[0],
        focused: false,
      })
      const win2Id = win2.id
      if (typeof win2Id !== 'number') {
        return null
      }
      await chrome.tabs.create({
        windowId: win2Id,
        url: win2Urls[1],
        active: false,
      })
      await chrome.tabs.create({
        windowId: win2Id,
        url: win2Urls[2],
        active: false,
      })

      const win1TabA = await getTabIdByUrl(win1Id, win1Urls[0])
      const win1TabB = await getTabIdByUrl(win1Id, win1Urls[1])
      const win2TabA = await getTabIdByUrl(win2Id, win2Urls[0])
      const win2TabB = await getTabIdByUrl(win2Id, win2Urls[1])
      if ([win1TabA, win1TabB, win2TabA, win2TabB].some((id) => id === -1)) {
        return null
      }

      const group1Id = await chrome.tabs.group({
        tabIds: [win1TabA, win1TabB],
        createProperties: {
          windowId: win1Id,
        },
      })
      await chrome.tabGroups.update(group1Id, {
        title: 'Window One Group',
        color: 'blue',
      })
      const group2Id = await chrome.tabs.group({
        tabIds: [win2TabA, win2TabB],
        createProperties: {
          windowId: win2Id,
        },
      })
      await chrome.tabGroups.update(group2Id, {
        title: 'Window Two Group',
        color: 'red',
      })
      return {
        group1Id,
        group2Id,
      }
    },
    {
      win1Urls: MULTI_WINDOW_URLS.win1,
      win2Urls: MULTI_WINDOW_URLS.win2,
    },
  )

  if (!setup) {
    throw new Error('Failed to setup multi-window grouped tabs')
  }
  return {
    group1Id: setup.group1Id,
    group2Id: setup.group2Id,
    win1Urls: MULTI_WINDOW_URLS.win1,
    win2Urls: MULTI_WINDOW_URLS.win2,
  }
}

const setupMixedGroupsInCurrentWindow = async (page: Page) => {
  const urls = [
    ...MIXED_GROUP_URLS.alpha,
    ...MIXED_GROUP_URLS.beta,
    ...MIXED_GROUP_URLS.gamma,
    ...MIXED_GROUP_URLS.free,
  ]
  await page.evaluate(async (urlsToCreate) => {
    for (const url of urlsToCreate) {
      await chrome.tabs.create({
        url,
        active: false,
      })
    }
  }, urls)
  await page.waitForTimeout(600)

  const alphaId = await groupTabsByUrl(page, {
    urls: MIXED_GROUP_URLS.alpha,
    title: 'Alpha Docs',
    color: 'blue',
  })
  const betaId = await groupTabsByUrl(page, {
    urls: MIXED_GROUP_URLS.beta,
    title: 'Beta Docs',
    color: 'green',
  })
  const gammaId = await groupTabsByUrl(page, {
    urls: MIXED_GROUP_URLS.gamma,
    title: 'Gamma Docs',
    color: 'red',
  })
  expect(alphaId).toBeGreaterThan(-1)
  expect(betaId).toBeGreaterThan(-1)
  expect(gammaId).toBeGreaterThan(-1)
  await updateTabGroup(page, alphaId, { collapsed: true })
  await updateTabGroup(page, betaId, { collapsed: false })
  await updateTabGroup(page, gammaId, { collapsed: true })
  await page.waitForTimeout(600)
  await page.reload()
  await waitForTestId(page, `tab-group-header-${alphaId}`)
  await waitForTestId(page, `tab-group-header-${betaId}`)
  await waitForTestId(page, `tab-group-header-${gammaId}`)

  return {
    alphaId,
    betaId,
    gammaId,
  }
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

  test('sort the tabs', async () => {
    await closeCurrentWindowTabsExceptActive(page, extensionURL)
    await page.reload()
    await waitForDefaultExtensionView(page)
    await openPages(browserContext, URLS)
    await page.bringToFront()
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(
      'The-Extension-page-should-sort-the-tabs-1.png',
      { maxDiffPixelRatio: 0.18, threshold: 0.2 },
    )

    let tabURLs = await page.$$eval(TAB_QUERY, (nodes) =>
      nodes.map((node) => node.querySelector('.text-xs').innerText),
    )
    expect(tabURLs).toHaveLength(URLS.length + 1)
    expect(tabURLs.filter((tab) => !isExtensionURL(tab))).toEqual([
      'https://pinboard.in/',
      'https://xcv58.com/',
      'https://nextjs.org/',
      'https://pinboard.in/',
      'https://duckduckgo.com/',
      'https://ops-class.org/',
    ])
    const pages = await browserContext.pages()
    const urls = await Promise.all(pages.map(async (page) => await page.url()))
    expect(new Set(urls.filter((x) => !isExtensionURL(x)))).toEqual(
      new Set([
        'https://pinboard.in/',
        'https://xcv58.com/',
        'https://nextjs.org/',
        'https://pinboard.in/',
        'https://duckduckgo.com/',
        'https://ops-class.org/',
      ]),
    )
    expect(pages).toHaveLength(URLS.length + 1)
    await page.locator('[data-testid^="window-title-"]').first().hover()
    await page.waitForTimeout(150)
    const sortTabsButton = await page.$('button[aria-label="Sort tabs"]')
    await sortTabsButton.click()
    await page.waitForTimeout(1000)

    tabURLs = await page.$$eval(TAB_QUERY, (nodes) =>
      nodes.map((node) => node.querySelector('.text-xs').innerText),
    )
    expect(tabURLs).toHaveLength(URLS.length + 1)
    const sortedUrls = tabURLs.filter((x) => !isExtensionURL(x))
    expect(sortedUrls).not.toEqual([
      'https://pinboard.in/',
      'https://xcv58.com/',
      'https://nextjs.org/',
      'https://pinboard.in/',
      'https://duckduckgo.com/',
      'https://ops-class.org/',
    ])
    expect(new Set(sortedUrls)).toEqual(
      new Set([
        'https://pinboard.in/',
        'https://xcv58.com/',
        'https://nextjs.org/',
        'https://duckduckgo.com/',
        'https://ops-class.org/',
      ]),
    )
    expect(sortedUrls[0]).toBe('https://duckduckgo.com/')
    expect(sortedUrls[1]).toBe('https://nextjs.org/')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(
      'sort the tabs 2.png',
      matchImageSnapshotOptions,
    )
  })

  test('preserve groups in multiple windows when sorting and clustering', async () => {
    const { group1Id, group2Id, win1Urls, win2Urls } =
      await setupMultiWindowGroups(page)
    expect(group1Id).toBeGreaterThan(-1)
    expect(group2Id).toBeGreaterThan(-1)
    await page.waitForTimeout(700)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${group1Id}`)
    await waitForTestId(page, `tab-group-header-${group2Id}`)

    const beforeGroup1 = await getGroupMembers(page, group1Id)
    const beforeGroup2 = await getGroupMembers(page, group2Id)
    expect(beforeGroup1.windowId).not.toBe(beforeGroup2.windowId)
    expect(beforeGroup1.urls).toEqual([win1Urls[0], win1Urls[1]])
    expect(beforeGroup2.urls).toEqual([win2Urls[0], win2Urls[1]])

    await page.locator('[data-testid^="window-title-"]').first().hover()
    await page.waitForTimeout(150)
    const sortTabsButton = await page.$('button[aria-label="Sort tabs"]')
    await sortTabsButton.click()
    await page.waitForTimeout(900)
    const clusterButton = await page.$(
      'button[aria-label="Cluster Ungrouped & Sort Tabs"]',
    )
    await clusterButton.click()
    await page.waitForTimeout(900)

    const afterGroup1 = await getGroupMembers(page, group1Id)
    const afterGroup2 = await getGroupMembers(page, group2Id)
    expect(afterGroup1.windowId).toBe(beforeGroup1.windowId)
    expect(afterGroup2.windowId).toBe(beforeGroup2.windowId)
    expect(afterGroup1).toEqual(beforeGroup1)
    expect(afterGroup2).toEqual(beforeGroup2)
    await expect(page.getByTestId(`tab-group-header-${group1Id}`)).toHaveCount(
      1,
    )
    await expect(page.getByTestId(`tab-group-header-${group2Id}`)).toHaveCount(
      1,
    )
  })

  test('many mixed groups should preserve collapsed state and membership after sort and clustering', async () => {
    const { alphaId, betaId, gammaId } =
      await setupMixedGroupsInCurrentWindow(page)
    const getGroupState = async (groupId: number) => {
      const members = await getGroupMembers(page, groupId)
      const tabGroup = await page.evaluate(async (id) => {
        return chrome.tabGroups.get(id)
      }, groupId)
      return {
        collapsed: tabGroup.collapsed,
        urls: members.urls,
        tabIds: members.tabIds,
      }
    }

    const beforeAlpha = await getGroupState(alphaId)
    const beforeBeta = await getGroupState(betaId)
    const beforeGamma = await getGroupState(gammaId)
    expect(beforeAlpha.collapsed).toBe(true)
    expect(beforeBeta.collapsed).toBe(false)
    expect(beforeGamma.collapsed).toBe(true)
    for (const tabId of beforeAlpha.tabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(0)
    }
    for (const tabId of beforeGamma.tabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(0)
    }
    for (const tabId of beforeBeta.tabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(1)
    }

    await page.locator('[data-testid^="window-title-"]').first().hover()
    await page.waitForTimeout(150)
    const sortTabsButton = await page.$('button[aria-label="Sort tabs"]')
    await sortTabsButton.click()
    await page.waitForTimeout(900)
    const clusterButton = await page.$(
      'button[aria-label="Cluster Ungrouped & Sort Tabs"]',
    )
    await clusterButton.click()
    await page.waitForTimeout(900)

    const afterAlpha = await getGroupState(alphaId)
    const afterBeta = await getGroupState(betaId)
    const afterGamma = await getGroupState(gammaId)
    expect(afterAlpha).toEqual(beforeAlpha)
    expect(afterBeta).toEqual(beforeBeta)
    expect(afterGamma).toEqual(beforeGamma)
    for (const tabId of afterAlpha.tabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(0)
    }
    for (const tabId of afterGamma.tabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(0)
    }
    for (const tabId of afterBeta.tabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(1)
    }
  })

  test('many mixed groups search should reveal only matched collapsed group tabs without mutating collapse state', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
      })
    })
    const { alphaId, betaId, gammaId } =
      await setupMixedGroupsInCurrentWindow(page)
    const alphaMembers = await getGroupMembers(page, alphaId)
    await getGroupMembers(page, betaId)
    const gammaMembers = await getGroupMembers(page, gammaId)

    const inputSelector = 'input[placeholder*="Search tabs or URLs"]'
    await page.fill(inputSelector, 'Alpha Docs')
    await page.waitForTimeout(700)
    for (const tabId of alphaMembers.tabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(1)
    }
    for (const tabId of gammaMembers.tabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(0)
    }

    const collapsedState = await page.evaluate(
      async ({ alphaId, betaId, gammaId }) => {
        const alpha = await chrome.tabGroups.get(alphaId)
        const beta = await chrome.tabGroups.get(betaId)
        const gamma = await chrome.tabGroups.get(gammaId)
        return {
          alpha: alpha.collapsed,
          beta: beta.collapsed,
          gamma: gamma.collapsed,
        }
      },
      {
        alphaId,
        betaId,
        gammaId,
      },
    )
    expect(collapsedState).toEqual({
      alpha: true,
      beta: false,
      gamma: true,
    })
  })

  test('ungrouping one multi-window group should not affect the other grouped window', async () => {
    const { group1Id, group2Id } = await setupMultiWindowGroups(page)
    await page.waitForTimeout(700)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${group1Id}`)
    await waitForTestId(page, `tab-group-header-${group2Id}`)

    const beforeGroup2 = await getGroupMembers(page, group2Id)
    await ungroupTabGroupById(page, group1Id)
    await page.waitForTimeout(700)
    await page.reload()

    const afterGroup1 = await getGroupMembers(page, group1Id)
    const afterGroup2 = await getGroupMembers(page, group2Id)
    expect(afterGroup1.tabIds).toHaveLength(0)
    expect(afterGroup2).toEqual(beforeGroup2)
    await expect(page.getByTestId(`tab-group-header-${group1Id}`)).toHaveCount(
      0,
    )
    await expect(page.getByTestId(`tab-group-header-${group2Id}`)).toHaveCount(
      1,
    )
  })

  test('collapsing one multi-window group should not collapse the other grouped window', async () => {
    const { group1Id, group2Id } = await setupMultiWindowGroups(page)
    await page.waitForTimeout(700)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${group1Id}`)
    await waitForTestId(page, `tab-group-header-${group2Id}`)

    const beforeGroup1 = await getGroupMembers(page, group1Id)
    const beforeGroup2 = await getGroupMembers(page, group2Id)
    await page.getByTestId(`tab-group-toggle-${group1Id}`).click()
    await page.waitForTimeout(700)

    const collapsedState = await page.evaluate(
      async ({ group1Id, group2Id }) => {
        const group1 = await chrome.tabGroups.get(group1Id)
        const group2 = await chrome.tabGroups.get(group2Id)
        return {
          group1Collapsed: group1.collapsed,
          group2Collapsed: group2.collapsed,
        }
      },
      {
        group1Id,
        group2Id,
      },
    )
    expect(collapsedState.group1Collapsed).toBe(true)
    expect(collapsedState.group2Collapsed).toBe(false)
    for (const tabId of beforeGroup1.tabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(0)
    }
    for (const tabId of beforeGroup2.tabIds) {
      await expect(page.getByTestId(`tab-row-${tabId}`)).toHaveCount(1)
    }
  })

  test('search input field should clear after selecting a command', async () => {
    // Set up initial page state
    await openPages(browserContext, LIGHTWEIGHT_URLS)
    await page.bringToFront()
    await page.waitForTimeout(1000)

    // Verify initial state
    const searchInput = await page.$(
      'input[placeholder*="Search tabs or URLs"]',
    )
    expect(searchInput).toBeTruthy()

    // Type a command in the search box
    await searchInput.click()
    await searchInput.fill('>clean dup')
    await page.waitForTimeout(1000)

    // Wait for and select the first command option that appears
    const commandOption = await page.waitForSelector('[role="option"]')
    await commandOption.click()
    await page.waitForTimeout(1000)

    // Verify that the input field is cleared after command selection
    const inputValue = await searchInput.inputValue()
    expect(inputValue).toBe('')
  })

  test('command search should match regardless of word order', async () => {
    await page.bringToFront()
    await page.reload()
    await waitForDefaultExtensionView(page)

    const searchInput = page.locator(
      'input[placeholder*="Search tabs or URLs"]',
    )
    await expect(searchInput).toBeVisible()

    const getCommandOptions = async (query: string) => {
      await searchInput.click()
      await searchInput.fill(query)
      const options = page.locator('[role="option"]')
      await expect(options.first()).toBeVisible()
      return (await options.allTextContents()).map((text) =>
        text.replace(/\s+/g, ' ').trim(),
      )
    }

    const canonicalOptions = await getCommandOptions('>expand window')
    const reorderedOptions = await getCommandOptions('>window expand')

    expect(reorderedOptions).toEqual(canonicalOptions)
    expect(
      reorderedOptions.some((text) => text.includes('Expand all windows')),
    ).toBe(true)
  })

  test('close tab when click close button', async () => {
    await openPages(browserContext, LIGHTWEIGHT_URLS)
    await page.bringToFront()
    await page.reload()
    await page.waitForTimeout(500)
    let tabs = await page.$$(TAB_QUERY)

    const pages = await browserContext.pages()
    expect(tabs.length).toBe(pages.length)
    const clickCloseButton = async (tabHandle) => {
      const closeButton = await tabHandle.$('button[aria-label="Close"]')
      if (closeButton) {
        await closeButton.click()
        return
      }
      throw new Error('close button not found in tab row')
    }

    await clickCloseButton(tabs[tabs.length - 1])
    await page.waitForTimeout(500)

    tabs = await page.$$(TAB_QUERY)
    expect(tabs.length).toBe(pages.length - 1)

    await clickCloseButton(tabs[tabs.length - 1])
    await page.waitForTimeout(500)

    tabs = await page.$$(TAB_QUERY)
    expect(tabs.length).toBe(pages.length - 2)

    await clickCloseButton(tabs[tabs.length - 1])
    await page.waitForTimeout(500)

    tabs = await page.$$(TAB_QUERY)
    expect(tabs.length).toBe(pages.length - 3)
  })
})
