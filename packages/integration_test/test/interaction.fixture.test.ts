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
  ungroupTabGroup,
  waitForDefaultExtensionView,
  waitForTestId,
  startIntegrationFixtureServer,
} from '../util'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string
let fixtureServer: IntegrationFixtureServer
let fixtureUrls: StandardFixtureUrls

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

  test('preserve existing tab groups when sorting and clustering', async () => {
    await openPages(browserContext, fixtureUrls.all)
    await page.bringToFront()
    await page.waitForTimeout(1000)
    const groupId = await groupTabsByUrl(page, {
      urls: [fixtureUrls.pinboard, fixtureUrls.nextjs],
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

  test('ungroup should remove the group header and restore flat tabs', async () => {
    await openPages(browserContext, fixtureUrls.all)
    await page.bringToFront()
    await page.waitForTimeout(1000)
    const groupId = await groupTabsByUrl(page, {
      urls: [fixtureUrls.pinboard, fixtureUrls.nextjs],
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
})
