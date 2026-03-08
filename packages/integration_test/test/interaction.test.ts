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
  ungroupTabGroup,
  ungroupTabGroupById,
  waitForTestId,
  waitForDefaultExtensionView,
  dragByTestId,
} from '../util'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

const getCenterOfRect = (rect: {
  top: number
  bottom: number
  left: number
  right: number
}) => {
  const { top, bottom, left, right } = rect
  return [(left + right) / 2, (top + bottom) / 2]
}

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

  test('preserve existing tab groups when sorting and clustering', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(1000)
    const groupId = await groupTabsByUrl(page, {
      urls: ['https://pinboard.in/', 'https://nextjs.org/'],
      title: 'Pinned Group',
      color: 'purple',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(800)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    const getGroupedTabIds = async () =>
      page.evaluate(async (id) => {
        const tabs = await chrome.tabs.query({
          currentWindow: true,
          groupId: id,
        })
        return tabs.map((tab) => tab.id).sort((a, b) => a - b)
      }, groupId)

    const beforeGroupedTabIds = await getGroupedTabIds()
    expect(beforeGroupedTabIds).toHaveLength(2)

    await page.locator('[data-testid^="window-title-"]').first().hover()
    await page.waitForTimeout(150)
    const sortTabsButton = await page.$('button[aria-label="Sort tabs"]')
    await sortTabsButton.click()
    await page.waitForTimeout(1000)
    expect(await getGroupedTabIds()).toEqual(beforeGroupedTabIds)

    const clusterButton = await page.$(
      'button[aria-label="Cluster Ungrouped & Sort Tabs"]',
    )
    await clusterButton.click()
    await page.waitForTimeout(1000)
    expect(await getGroupedTabIds()).toEqual(beforeGroupedTabIds)
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

  test('ungroup should remove the group header and restore flat tabs', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.waitForTimeout(1000)
    const groupId = await groupTabsByUrl(page, {
      urls: ['https://pinboard.in/', 'https://nextjs.org/'],
      title: 'Temporary Group',
      color: 'blue',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(800)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    await ungroupTabGroup(page, groupId)
    await page.waitForTimeout(800)
    await expect(page.getByTestId(`tab-group-header-${groupId}`)).toHaveCount(0)
  })

  test('search input field should clear after selecting a command', async () => {
    // Set up initial page state
    await openPages(browserContext, URLS)
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
    const commandOption = await page.waitForSelector('.MuiAutocomplete-option')
    await commandOption.click()
    await page.waitForTimeout(1000)

    // Verify that the input field is cleared after command selection
    const inputValue = await searchInput.inputValue()
    expect(inputValue).toBe('')
  })

  test('close tab when click close button', async () => {
    await openPages(browserContext, URLS)
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

  test('support different theme', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.waitForTimeout(500)
    let toggleThemeButton = await page.$(
      '[aria-label="Toggle light/dark theme"]',
    )
    await toggleThemeButton.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Control+,')
    await page.waitForTimeout(500)
    await page.waitForSelector('[aria-labelledby="update-font-size"]')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    const themedPanel = page
      .locator('.MuiDialogContent-root section')
      .nth(1)
      .locator('.rounded-xl.border')
      .first()
    await expect(themedPanel).toBeVisible()
    expect(await themedPanel.screenshot()).toMatchSnapshot(
      matchImageSnapshotOptions,
    )

    await page.keyboard.press('?')
    await page.waitForTimeout(500)
    await page.waitForSelector('table')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    toggleThemeButton = await page.$('[aria-label="Toggle light/dark theme"]')
    await toggleThemeButton.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)
  })

  test('support font size change', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)
    await page.keyboard.press('Control+,')
    await page.waitForTimeout(500)
    await page.waitForSelector('[aria-labelledby="update-font-size"]')
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)
    const minFontSize = (
      await page.$$('span[data-index="0"].MuiSlider-mark')
    )[1]
    await minFontSize.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    const largeFontSize = (
      await page.$$('span[data-index="15"].MuiSlider-mark')
    )[1]
    await largeFontSize.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    const defaultFontSize = (
      await page.$$('span[data-index="8"].MuiSlider-mark')
    )[1]
    await defaultFontSize.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  })

  test('support toggle always show toolbar', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.keyboard.press('Control+,')
    await page.waitForTimeout(500)
    await page.waitForSelector('[aria-labelledby="toggle-always-show-toolbar"]')
    await page.waitForTimeout(500)
    let screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    let toogleButton = await page.$(
      '[aria-labelledby="toggle-always-show-toolbar"]',
    )
    await toogleButton.click()

    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    toogleButton = await page.$(
      '[aria-labelledby="toggle-always-show-toolbar"]',
    )
    await toogleButton.click()
    await page.waitForTimeout(500)
    screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  })

  test('support drag and drop to reorder tabs', async () => {
    await openPages(browserContext, URLS)
    await page.bringToFront()
    await page.reload()
    await page.waitForTimeout(500)
    const tabs = await page.$$(TAB_QUERY)
    const pages = await browserContext.pages()
    expect(tabs.length).toBe(pages.length)
    const lastTab = tabs[tabs.length - 1]
    const lastTabTestId = await lastTab.getAttribute('data-testid')
    expect(lastTabTestId).toBeTruthy()
    const rect = await lastTab.evaluate((node) => {
      const { top, bottom, left, right } = node.getBoundingClientRect()
      return { top, bottom, left, right }
    })
    const [x, y] = getCenterOfRect(rect)
    await page.mouse.move(x, y, { steps: 10 })
    const dragHandle = page
      .locator(`[data-testid="${lastTabTestId}"] [aria-label="Drag tab"]`)
      .first()
    await expect(dragHandle).toBeVisible()
    const dragHandleRect = await dragHandle.evaluate((node) => {
      const { top, bottom, left, right } = node.getBoundingClientRect()
      return { top, bottom, left, right }
    })
    const [xx, yy] = getCenterOfRect(dragHandleRect)
    await page.mouse.move(xx, yy, { steps: 6 })
    await page.mouse.down()
    // Playwright triggers the drag effect but it wouldn't move the cursor.
    await page.mouse.move(xx + 160, yy + 24, { steps: 12 })
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchSnapshot(matchImageSnapshotOptions)
    const droppableTool = page.locator('div.h-12.px-1.text-3xl.z-10').first()
    await expect(droppableTool).toBeVisible()
    expect(await droppableTool.screenshot()).toMatchSnapshot(
      matchImageSnapshotOptions,
    )
    await page.mouse.up()
  })

  test('drop ungrouped tab into grouped tabs should keep one intact target group', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(600)

    const sourceUrl = 'data:text/html,drop-source-1'
    const groupedUrls = [
      'data:text/html,drop-group-2',
      'data:text/html,drop-group-3',
      'data:text/html,drop-group-4',
    ]
    await openPages(browserContext, [sourceUrl, ...groupedUrls])
    await page.bringToFront()
    await page.waitForTimeout(900)

    const groupId = await groupTabsByUrl(page, {
      urls: groupedUrls,
      title: 'Drop Group',
      color: 'blue',
    })
    expect(groupId).toBeGreaterThan(-1)
    const setup = await page.evaluate(
      async ({ sourceUrl, groupId }) => {
        const tabs = await chrome.tabs.query({
          currentWindow: true,
        })
        const groupedTabs = (
          await chrome.tabs.query({
            groupId,
          })
        ).sort((a, b) => a.index - b.index)
        const sourceTabId = tabs.find((tab) => tab.url === sourceUrl)?.id ?? -1
        const dropTargetTabId = groupedTabs[1]?.id ?? -1
        return {
          sourceTabId,
          dropTargetTabId,
        }
      },
      {
        sourceUrl,
        groupId,
      },
    )
    expect(setup.sourceTabId).toBeGreaterThan(0)
    expect(setup.dropTargetTabId).toBeGreaterThan(0)
    const { sourceTabId, dropTargetTabId } = setup
    await page.waitForTimeout(700)
    await page.reload()
    await page.waitForTimeout(1200)

    const sourceRow = page.getByTestId(`tab-row-${sourceTabId}`)
    const targetRow = page.getByTestId(`tab-row-${dropTargetTabId}`)
    await expect(sourceRow).toHaveCount(1)
    await expect(targetRow).toHaveCount(1)
    await dragByTestId(page, {
      sourceTestId: `tab-row-${sourceTabId}`,
      targetTestId: `tab-row-${dropTargetTabId}`,
      dropPosition: 'bottom',
      targetUseParent: true,
    })
    await page.waitForTimeout(900)

    const result = await page.evaluate(
      async ({ sourceTabId, dropTargetTabId, groupId }) => {
        const tabs = (
          await chrome.tabs.query({
            currentWindow: true,
          })
        ).sort((a, b) => a.index - b.index)
        const groupTabs = tabs.filter((tab) => tab.groupId === groupId)
        const source = tabs.find((tab) => tab.id === sourceTabId)
        const dropTarget = tabs.find((tab) => tab.id === dropTargetTabId)
        const contiguous = groupTabs.every((tab, idx) => {
          if (idx === 0) {
            return true
          }
          return tab.index === groupTabs[idx - 1].index + 1
        })
        const sourceIndex = groupTabs.findIndex((tab) => tab.id === sourceTabId)
        const dropTargetIndex = groupTabs.findIndex(
          (tab) => tab.id === dropTargetTabId,
        )
        return {
          sourceGroupId: source?.groupId ?? chrome.tabGroups.TAB_GROUP_ID_NONE,
          groupCount: groupTabs.length,
          contiguous,
          sourceIndex,
          dropTargetIndex,
          sourceChromeIndex: source?.index ?? -1,
          dropTargetChromeIndex: dropTarget?.index ?? -1,
        }
      },
      {
        sourceTabId,
        dropTargetTabId,
        groupId,
      },
    )
    expect(result.sourceGroupId).toBe(groupId)
    expect(result.groupCount).toBe(4)
    expect(result.contiguous).toBe(true)
    await expect(page.getByTestId(`tab-group-header-${groupId}`)).toHaveCount(1)
    await expect(page.getByTestId(`tab-group-count-${groupId}`)).toHaveText('4')
  })

  test('drag single grouped tab should reorder within same group', async () => {
    const groupedUrls = [
      'data:text/html,reorder-group-1',
      'data:text/html,reorder-group-2',
      'data:text/html,reorder-group-3',
    ]
    await openPages(browserContext, groupedUrls)
    await page.bringToFront()
    await page.waitForTimeout(700)

    const groupId = await groupTabsByUrl(page, {
      urls: groupedUrls,
      title: 'Reorder Group',
      color: 'cyan',
    })
    expect(groupId).toBeGreaterThan(-1)
    const setup = await page.evaluate(async (groupId) => {
      const groupedTabs = (
        await chrome.tabs.query({
          groupId,
        })
      ).sort((a, b) => a.index - b.index)
      return {
        firstTabId: groupedTabs[0]?.id ?? -1,
        thirdTabId: groupedTabs[2]?.id ?? -1,
        orderedUrls: groupedTabs.map((tab) => tab.url),
      }
    }, groupId)
    expect(setup.firstTabId).toBeGreaterThan(0)
    expect(setup.thirdTabId).toBeGreaterThan(0)
    await page.reload()
    await waitForTestId(page, `tab-row-${setup.firstTabId}`)
    await waitForTestId(page, `tab-row-${setup.thirdTabId}`)

    await dragByTestId(page, {
      sourceTestId: `tab-row-${setup.firstTabId}`,
      targetTestId: `tab-row-${setup.thirdTabId}`,
      targetUseParent: true,
      dropPosition: 'bottom',
    })
    await page.waitForTimeout(900)

    const reordered = await page.evaluate(
      async ({ groupId, sourceTabId }) => {
        const tabs = (
          await chrome.tabs.query({
            groupId,
          })
        ).sort((a, b) => a.index - b.index)
        const sourceIndex = tabs.findIndex((tab) => tab.id === sourceTabId)
        const contiguous = tabs.every((tab, idx) => {
          if (idx === 0) {
            return true
          }
          return tab.index === tabs[idx - 1].index + 1
        })
        return {
          sourceGroupId:
            tabs[sourceIndex]?.groupId ?? chrome.tabGroups.TAB_GROUP_ID_NONE,
          sourceIndex,
          groupCount: tabs.length,
          contiguous,
        }
      },
      { groupId, sourceTabId: setup.firstTabId },
    )
    expect(reordered.sourceGroupId).toBe(groupId)
    expect(reordered.sourceIndex).toBeGreaterThan(-1)
    expect(reordered.groupCount).toBe(3)
    expect(reordered.contiguous).toBe(true)
  })

  test('drag grouped tab to top and bottom window zones should move it out without breaking source group', async () => {
    const groupedUrls = [
      'data:text/html,zone-group-1',
      'data:text/html,zone-group-2',
      'data:text/html,zone-group-3',
    ]
    await openPages(browserContext, groupedUrls)
    await page.bringToFront()
    await page.waitForTimeout(700)

    const groupId = await groupTabsByUrl(page, {
      urls: groupedUrls,
      title: 'Zone Group',
      color: 'green',
    })
    expect(groupId).toBeGreaterThan(-1)
    const setup = await page.evaluate(async (groupId) => {
      const groupedTabs = (
        await chrome.tabs.query({
          groupId,
        })
      ).sort((a, b) => a.index - b.index)
      return {
        firstTabId: groupedTabs[0]?.id ?? -1,
        secondTabId: groupedTabs[1]?.id ?? -1,
      }
    }, groupId)
    expect(setup.firstTabId).toBeGreaterThan(0)
    expect(setup.secondTabId).toBeGreaterThan(0)
    await page.reload()
    await page.waitForSelector('[data-testid^="window-drop-zone-top-"]')
    await page.waitForSelector('[data-testid^="window-drop-zone-bottom-"]')
    const zones = await page.evaluate(() => {
      const top = Array.from(
        document.querySelectorAll('[data-testid^="window-drop-zone-top-"]'),
      ).map((node) => node.getAttribute('data-testid') || '')
      const bottom = Array.from(
        document.querySelectorAll('[data-testid^="window-drop-zone-bottom-"]'),
      ).map((node) => node.getAttribute('data-testid') || '')
      return { top, bottom }
    })
    expect(zones.top.length).toBeGreaterThan(0)
    expect(zones.bottom.length).toBeGreaterThan(0)
    const topZone = zones.top[0]
    const zoneWindowId = topZone.replace('window-drop-zone-top-', '')
    const bottomZone =
      zones.bottom.find((id) => id.endsWith(zoneWindowId)) || zones.bottom[0]

    await dragByTestId(page, {
      sourceTestId: `tab-row-${setup.firstTabId}`,
      targetTestId: topZone,
      dropPosition: 'middle',
    })
    await page.waitForTimeout(800)

    let result = await page.evaluate(
      async ({ groupId, movedTabId }) => {
        const noGroup = chrome.tabGroups.TAB_GROUP_ID_NONE
        const movedTab = await chrome.tabs.get(movedTabId)
        const groupedTabs = await chrome.tabs.query({ groupId })
        return {
          movedTabGroupId: movedTab.groupId,
          groupedCount: groupedTabs.length,
          noGroup,
        }
      },
      { groupId, movedTabId: setup.firstTabId },
    )
    expect(result.movedTabGroupId).toBe(result.noGroup)
    expect(result.groupedCount).toBe(2)

    await dragByTestId(page, {
      sourceTestId: `tab-row-${setup.secondTabId}`,
      targetTestId: bottomZone,
      dropPosition: 'middle',
    })
    await page.waitForTimeout(800)

    result = await page.evaluate(
      async ({ groupId, movedTabId }) => {
        const noGroup = chrome.tabGroups.TAB_GROUP_ID_NONE
        const movedTab = await chrome.tabs.get(movedTabId)
        const groupedTabs = await chrome.tabs.query({ groupId })
        return {
          movedTabGroupId: movedTab.groupId,
          groupedCount: groupedTabs.length,
          noGroup,
        }
      },
      { groupId, movedTabId: setup.secondTabId },
    )
    expect(result.movedTabGroupId).toBe(result.noGroup)
    expect(result.groupedCount).toBe(1)
  })

  test('group drag handle should move entire group block', async () => {
    const urls = [
      'data:text/html,handle-ungrouped-before',
      'data:text/html,handle-group-1',
      'data:text/html,handle-group-2',
      'data:text/html,handle-ungrouped-after',
    ]
    await openPages(browserContext, urls)
    await page.bringToFront()
    await page.waitForTimeout(700)

    const groupId = await groupTabsByUrl(page, {
      urls: [urls[1], urls[2]],
      title: 'Handle Group',
      color: 'purple',
    })
    expect(groupId).toBeGreaterThan(-1)
    const setup = await page.evaluate(async (targetUrl) => {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      return {
        targetTabId: tabs.find((tab) => tab.url === targetUrl)?.id ?? -1,
      }
    }, urls[3])
    expect(setup.targetTabId).toBeGreaterThan(0)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)
    await waitForTestId(page, `tab-row-${setup.targetTabId}`)
    await page.getByTestId(`tab-group-header-${groupId}`).hover()
    await page.waitForTimeout(200)
    await expect(
      page.getByTestId(`tab-group-drag-handle-${groupId}`),
    ).toBeVisible()

    const sourceBox = await page
      .getByTestId(`tab-group-drag-handle-${groupId}`)
      .boundingBox()
    const targetBox = await page
      .getByTestId(`tab-row-${setup.targetTabId}`)
      .boundingBox()
    expect(sourceBox).not.toBeNull()
    expect(targetBox).not.toBeNull()
    if (!sourceBox || !targetBox) {
      throw new Error('Unable to resolve drag source/target bounding boxes')
    }
    const sourceX = sourceBox.x + sourceBox.width / 2
    const sourceY = sourceBox.y + sourceBox.height / 2
    const targetX = targetBox.x + Math.min(16, targetBox.width / 2)
    const targetY = targetBox.y + targetBox.height - 2
    await page.mouse.move(sourceX, sourceY)
    await page.mouse.down()
    await page.mouse.move(targetX, targetY, { steps: 16 })
    await page.mouse.up()
    await page.waitForTimeout(900)

    const moved = await page.evaluate(
      async ({ groupId, targetTabId }) => {
        const tabs = (await chrome.tabs.query({ currentWindow: true })).sort(
          (a, b) => a.index - b.index,
        )
        const groupTabs = tabs.filter((tab) => tab.groupId === groupId)
        const targetTab = tabs.find((tab) => tab.id === targetTabId)
        const contiguous = groupTabs.every((tab, idx) => {
          if (idx === 0) {
            return true
          }
          return tab.index === groupTabs[idx - 1].index + 1
        })
        return {
          contiguous,
          groupStart: groupTabs[0]?.index ?? -1,
          targetIndex: targetTab?.index ?? -1,
        }
      },
      { groupId, targetTabId: setup.targetTabId },
    )
    expect(moved.contiguous).toBe(true)
    expect(moved.groupStart).toBeGreaterThan(-1)
    await expect(page.getByTestId(`tab-group-header-${groupId}`)).toHaveCount(1)
    await expect(page.getByTestId(`tab-group-count-${groupId}`)).toHaveText('2')
  })

  test('window with one group should support both join-group drop and ungrouped zone drop', async () => {
    const setup = await page.evaluate(async () => {
      const sourceTab = await chrome.tabs.create({
        url: 'data:text/html,only-group-source-join',
        active: false,
      })
      const targetWin = await chrome.windows.create({
        url: 'data:text/html,only-group-a',
        focused: false,
      })
      const targetWindowId = targetWin.id
      if (typeof targetWindowId !== 'number') {
        return null
      }
      const secondTargetTab = await chrome.tabs.create({
        windowId: targetWindowId,
        url: 'data:text/html,only-group-b',
        active: false,
      })
      const targetTabs = await chrome.tabs.query({ windowId: targetWindowId })
      const groupId = await chrome.tabs.group({
        tabIds: targetTabs.map((tab) => tab.id),
      })
      await chrome.tabGroups.update(groupId, {
        title: 'Only Group',
        color: 'blue',
      })
      const sourceTab2 = await chrome.tabs.create({
        url: 'data:text/html,only-group-source-zone',
        active: false,
      })
      return {
        groupId,
        sourceTabId: sourceTab.id ?? -1,
        sourceTab2Id: sourceTab2.id ?? -1,
        targetWindowId,
        targetTabId: secondTargetTab.id ?? -1,
      }
    })
    expect(setup).not.toBeNull()
    if (!setup) {
      return
    }
    await page.reload()
    await waitForTestId(page, `tab-group-header-${setup.groupId}`)
    await page.waitForSelector('[data-testid^="window-drop-zone-bottom-"]')
    const bottomZone = await page.evaluate(() => {
      const node = document.querySelector(
        '[data-testid^="window-drop-zone-bottom-"]',
      ) as HTMLElement | null
      return node?.dataset?.testid || ''
    })
    expect(bottomZone).not.toBe('')

    await dragByTestId(page, {
      sourceTestId: `tab-row-${setup.sourceTabId}`,
      targetTestId: `tab-row-${setup.targetTabId}`,
      targetUseParent: true,
      dropPosition: 'bottom',
    })
    await page.waitForTimeout(900)

    let state = await page.evaluate(
      async ({ sourceTabId, groupId }) => {
        const movedTab = await chrome.tabs.get(sourceTabId)
        return {
          movedTabGroupId: movedTab.groupId,
          groupId,
        }
      },
      { sourceTabId: setup.sourceTabId, groupId: setup.groupId },
    )
    expect(state.movedTabGroupId).toBe(state.groupId)

    await dragByTestId(page, {
      sourceTestId: `tab-row-${setup.sourceTab2Id}`,
      targetTestId: bottomZone,
      dropPosition: 'middle',
    })
    await page.waitForTimeout(900)

    state = await page.evaluate(
      async ({ sourceTab2Id }) => {
        const noGroup = chrome.tabGroups.TAB_GROUP_ID_NONE
        const movedTab = await chrome.tabs.get(sourceTab2Id)
        return {
          movedTabGroupId: movedTab.groupId,
          noGroup,
        }
      },
      { sourceTab2Id: setup.sourceTab2Id },
    )
    expect(state.movedTabGroupId).toBe(state.noGroup)
  })

  test('drop on collapsed group header should insert tab at group start', async () => {
    const sourceUrl = 'data:text/html,collapsed-header-source'
    const groupedUrls = [
      'data:text/html,collapsed-header-a',
      'data:text/html,collapsed-header-b',
    ]
    await openPages(browserContext, [sourceUrl, ...groupedUrls])
    await page.bringToFront()
    await page.waitForTimeout(700)

    const groupId = await groupTabsByUrl(page, {
      urls: groupedUrls,
      title: 'Collapsed Header Group',
      color: 'orange',
    })
    expect(groupId).toBeGreaterThan(-1)
    await updateTabGroup(page, groupId, { collapsed: true })
    const setup = await page.evaluate(
      async ({ sourceUrl, groupedUrls }) => {
        const tabs = await chrome.tabs.query({ currentWindow: true })
        return {
          sourceTabId: tabs.find((tab) => tab.url === sourceUrl)?.id ?? -1,
          firstGroupTabId:
            tabs.find((tab) => tab.url === groupedUrls[0])?.id ?? -1,
        }
      },
      { sourceUrl, groupedUrls },
    )
    expect(setup.sourceTabId).toBeGreaterThan(0)
    expect(setup.firstGroupTabId).toBeGreaterThan(0)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    await dragByTestId(page, {
      sourceTestId: `tab-row-${setup.sourceTabId}`,
      targetTestId: `tab-group-header-${groupId}`,
      dropPosition: 'middle',
    })
    await page.waitForTimeout(900)

    const result = await page.evaluate(
      async ({ sourceTabId, groupId }) => {
        const noGroup = chrome.tabGroups.TAB_GROUP_ID_NONE
        const tabs = await chrome.tabs.query({ groupId })
        const ordered = tabs.sort((a, b) => a.index - b.index)
        const source = await chrome.tabs.get(sourceTabId)
        return {
          sourceGroupId: source.groupId,
          sourceIsFirst: ordered[0]?.id === sourceTabId,
          orderedSize: ordered.length,
          noGroup,
        }
      },
      { sourceTabId: setup.sourceTabId, groupId },
    )
    expect(result.sourceGroupId).not.toBe(result.noGroup)
    expect(result.sourceIsFirst).toBe(true)
    expect(result.orderedSize).toBe(3)
  })

  test('drop above group header should move tab before group without joining it', async () => {
    const sourceUrl = 'data:text/html,before-group-header-source'
    const groupedUrls = [
      'data:text/html,before-group-header-a',
      'data:text/html,before-group-header-b',
    ]
    await openPages(browserContext, [sourceUrl, ...groupedUrls])
    await page.bringToFront()
    await page.waitForTimeout(700)

    const groupId = await groupTabsByUrl(page, {
      urls: groupedUrls,
      title: 'Before Header Group',
      color: 'blue',
    })
    expect(groupId).toBeGreaterThan(-1)
    const setup = await page.evaluate(
      async ({ sourceUrl, groupedUrls }) => {
        const tabs = await chrome.tabs.query({ currentWindow: true })
        return {
          sourceTabId: tabs.find((tab) => tab.url === sourceUrl)?.id ?? -1,
          firstGroupTabId:
            tabs.find((tab) => tab.url === groupedUrls[0])?.id ?? -1,
        }
      },
      { sourceUrl, groupedUrls },
    )
    expect(setup.sourceTabId).toBeGreaterThan(0)
    expect(setup.firstGroupTabId).toBeGreaterThan(0)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    await dragByTestId(page, {
      sourceTestId: `tab-row-${setup.sourceTabId}`,
      targetTestId: `tab-group-header-${groupId}`,
      dropPosition: 'top',
    })
    await page.waitForTimeout(900)

    const result = await page.evaluate(
      async ({ sourceTabId, groupId }) => {
        const noGroup = chrome.tabGroups.TAB_GROUP_ID_NONE
        const allTabs = (await chrome.tabs.query({ currentWindow: true })).sort(
          (a, b) => a.index - b.index,
        )
        const source = allTabs.find((tab) => tab.id === sourceTabId)
        const groupedTabs = allTabs.filter((tab) => tab.groupId === groupId)
        return {
          sourceGroupId: source?.groupId ?? noGroup,
          sourceBeforeGroup:
            (source?.index ?? Number.MAX_SAFE_INTEGER) <
            (groupedTabs[0]?.index ?? -1),
          groupedSize: groupedTabs.length,
          noGroup,
        }
      },
      { sourceTabId: setup.sourceTabId, groupId },
    )
    expect(result.sourceGroupId).toBe(result.noGroup)
    expect(result.sourceBeforeGroup).toBe(true)
    expect(result.groupedSize).toBe(2)
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
})
