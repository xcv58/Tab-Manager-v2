import { By, WebDriver, until } from 'selenium-webdriver'
import { createServer } from 'node:http'
import {
  SEARCH_INPUT_SELECTOR,
  FirefoxExtensionSession,
  initBrowserWithExtension,
  closeBrowserWithExtension,
  clearExtensionStorage,
  closeNonExtensionTabs,
  openPages,
  waitForCss,
  waitForText,
  waitForTestIdCount,
  clickByTestId,
  groupTabsByUrl,
  getGroupMembers,
  getTabGroup,
  updateTabGroup,
  dragByTestId,
  getTabsByUrls,
  saveFirefoxDiagnostics,
  executeInExtension,
} from '../util'

let fixtureBaseURL = ''
const uniqueUrls = (prefix: string, size: number) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`
  return [...Array(size)].map(
    (_, index) =>
      `${fixtureBaseURL}/?tab-manager-v2-firefox-e2e=${prefix}-${stamp}-${index}`,
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

const describeFirefox =
  process.env.FIREFOX_E2E === '1' ? describe : describe.skip

describeFirefox('Firefox extension grouped tabs integration', () => {
  const fixtureServer = createServer((_request, response) => {
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    response.end('<title>Firefox group fixture</title><p>Local sample tab</p>')
  })
  let session: FirefoxExtensionSession
  let driver: WebDriver
  let extensionURL: string

  beforeAll(async () => {
    await new Promise<void>((resolve) =>
      fixtureServer.listen(0, '127.0.0.1', resolve),
    )
    const address = fixtureServer.address()
    if (!address || typeof address === 'string')
      throw new Error('Missing fixture port')
    fixtureBaseURL = `http://127.0.0.1:${address.port}`
    session = await initBrowserWithExtension()
    driver = session.driver
    extensionURL = session.extensionURL
  })

  afterAll(async () => {
    try {
      if (session) await closeBrowserWithExtension(session)
    } finally {
      fixtureServer.closeAllConnections()
      await new Promise<void>((resolve) => fixtureServer.close(() => resolve()))
    }
  })

  afterEach(async () => {
    await saveFirefoxDiagnostics(
      driver,
      expect.getState().currentTestName || 'grouped-tabs',
    )
  })

  beforeEach(async () => {
    await resetExtensionState(session)
  })

  it('opens extension page and renders search input (no endless top loading)', async () => {
    await driver.get(extensionURL)
    const searchInput = await waitForCss(driver, SEARCH_INPUT_SELECTOR)
    expect(await searchInput.isDisplayed()).toBe(true)
  })

  it('renders group header and reflects browser-side rename/recolor updates', async () => {
    const [urlA, urlB] = uniqueUrls('group-header', 2)
    await openPages(driver, [urlA, urlB])
    const groupId = await groupTabsByUrl(driver, {
      urls: [urlA, urlB],
      title: 'Docs',
      color: 'blue',
    })
    expect(groupId).toBeGreaterThan(-1)

    await driver.get(extensionURL)
    await waitForTestIdCount(driver, `tab-group-header-${groupId}`, 1)
    await waitForText(
      driver,
      `[data-testid="tab-group-title-${groupId}"]`,
      'Docs',
    )
    await waitForText(driver, `[data-testid="tab-group-count-${groupId}"]`, '2')

    const barSelector = `[data-testid="tab-group-bar-${groupId}"]`
    const colorBefore = (await driver.executeScript(
      'const el = document.querySelector(arguments[0]); return el ? getComputedStyle(el).backgroundColor : "";',
      barSelector,
    )) as string

    await updateTabGroup(driver, groupId, {
      title: 'Renamed Docs',
      color: 'red',
    })

    await waitForText(
      driver,
      `[data-testid="tab-group-title-${groupId}"]`,
      'Renamed Docs',
    )
    await driver.wait(async () => {
      const colorAfter = (await driver.executeScript(
        'const el = document.querySelector(arguments[0]); return el ? getComputedStyle(el).backgroundColor : "";',
        barSelector,
      )) as string
      return colorAfter !== '' && colorAfter !== colorBefore
    }, 30000)
  })

  it('syncs collapse state both ways between UI toggle and browser update', async () => {
    const [urlA, urlB] = uniqueUrls('collapse-sync', 2)
    await openPages(driver, [urlA, urlB])
    const groupId = await groupTabsByUrl(driver, {
      urls: [urlA, urlB],
      title: 'Collapse Sync',
      color: 'green',
    })
    expect(groupId).toBeGreaterThan(-1)

    await driver.get(extensionURL)
    await waitForTestIdCount(driver, `tab-group-header-${groupId}`, 1)
    const members = await getGroupMembers(driver, groupId)
    expect(members.tabIds).toHaveLength(2)

    await clickByTestId(driver, `tab-group-toggle-${groupId}`)
    await driver.wait(async () => {
      const group = await getTabGroup(driver, groupId)
      return group.collapsed === true
    }, 30000)
    for (const tabId of members.tabIds) {
      await waitForTestIdCount(driver, `tab-row-${tabId}`, 0)
    }

    await updateTabGroup(driver, groupId, { collapsed: false })
    await driver.wait(async () => {
      const group = await getTabGroup(driver, groupId)
      return group.collapsed === false
    }, 30000)
    for (const tabId of members.tabIds) {
      await waitForTestIdCount(driver, `tab-row-${tabId}`, 1)
    }
  })

  it('supports grouped drag semantics: reorder in group and move one tab out to ungrouped zone', async () => {
    const [freeUrl, groupUrlA, groupUrlB] = uniqueUrls('drag-reorder', 3)
    await openPages(driver, [freeUrl, groupUrlA, groupUrlB])
    const groupId = await groupTabsByUrl(driver, {
      urls: [groupUrlA, groupUrlB],
      title: 'DnD Group',
      color: 'purple',
    })
    expect(groupId).toBeGreaterThan(-1)

    await driver.get(extensionURL)
    await waitForTestIdCount(driver, `tab-group-header-${groupId}`, 1)
    const initialMembers = await getGroupMembers(driver, groupId)
    expect(initialMembers.tabIds).toHaveLength(2)

    await dragByTestId(driver, {
      sourceTestId: `tab-row-${initialMembers.tabIds[1]}`,
      targetTestId: `tab-row-${initialMembers.tabIds[0]}`,
      dropPosition: 'top',
    })

    await driver.wait(async () => {
      const membersAfterReorder = await getGroupMembers(driver, groupId)
      return membersAfterReorder.urls[0] === initialMembers.urls[1]
    }, 30000)

    const membersAfterReorder = await getGroupMembers(driver, groupId)
    await dragByTestId(driver, {
      sourceTestId: `tab-row-${membersAfterReorder.tabIds[0]}`,
      targetTestId: `window-drop-zone-top-${membersAfterReorder.windowId}`,
      dropPosition: 'middle',
    })

    await driver.wait(async () => {
      const membersAfterMoveOut = await getGroupMembers(driver, groupId)
      return membersAfterMoveOut.tabIds.length === 1
    }, 30000)

    const movedOutUrl = membersAfterReorder.urls[0]
    const snapshots = await getTabsByUrls(driver, [
      movedOutUrl,
      groupUrlA,
      groupUrlB,
    ])
    const movedOutTab = snapshots.find((tab) => tab.url === movedOutUrl)
    const groupedTabs = snapshots.filter((tab) => tab.url !== movedOutUrl)
    expect(movedOutTab?.groupId).toBe(-1)
    expect(groupedTabs.every((tab) => tab.groupId === groupId)).toBe(true)
  })

  it('drop above group header keeps tab ungrouped and places it before the group', async () => {
    const [freeUrl, groupUrlA, groupUrlB] = uniqueUrls('drop-above-group', 3)
    await openPages(driver, [freeUrl, groupUrlA, groupUrlB])
    const groupId = await groupTabsByUrl(driver, {
      urls: [groupUrlA, groupUrlB],
      title: 'Header Target',
      color: 'yellow',
    })
    expect(groupId).toBeGreaterThan(-1)

    await driver.get(extensionURL)
    await waitForTestIdCount(driver, `tab-group-header-${groupId}`, 1)

    const snapshotsBefore = await getTabsByUrls(driver, [
      freeUrl,
      groupUrlA,
      groupUrlB,
    ])
    const freeTab = snapshotsBefore.find((tab) => tab.url === freeUrl)
    expect(freeTab).toBeDefined()

    await dragByTestId(driver, {
      sourceTestId: `tab-row-${freeTab?.id}`,
      targetTestId: `tab-group-header-${groupId}`,
      dropPosition: 'top',
      targetUseParent: true,
    })

    await driver.wait(async () => {
      const snapshots = await getTabsByUrls(driver, [
        freeUrl,
        groupUrlA,
        groupUrlB,
      ])
      const free = snapshots.find((tab) => tab.url === freeUrl)
      const grouped = snapshots.filter((tab) => tab.url !== freeUrl)
      if (!free || grouped.length === 0) {
        return false
      }
      const minGroupedIndex = Math.min(...grouped.map((tab) => tab.index))
      return free.groupId === -1 && free.index < minGroupedIndex
    }, 30000)
  })

  it('ungroup removes header and restores tabs as ungrouped rows', async () => {
    const [urlA, urlB] = uniqueUrls('ungroup', 2)
    await openPages(driver, [urlA, urlB])
    const groupId = await groupTabsByUrl(driver, {
      urls: [urlA, urlB],
      title: 'Ungroup Case',
      color: 'cyan',
    })
    expect(groupId).toBeGreaterThan(-1)

    await driver.get(extensionURL)
    await waitForTestIdCount(driver, `tab-group-header-${groupId}`, 1)
    const members = await getGroupMembers(driver, groupId)
    expect(members.tabIds).toHaveLength(2)

    const header = await waitForCss(
      driver,
      `[data-testid="tab-group-header-${groupId}"]`,
    )
    await driver.actions({ async: true }).move({ origin: header }).perform()
    await clickByTestId(driver, `tab-group-menu-${groupId}`)
    await clickByTestId(driver, `tab-group-menu-ungroup-${groupId}`)

    await waitForTestIdCount(driver, `tab-group-header-${groupId}`, 0)
    for (const tabId of members.tabIds) {
      await waitForTestIdCount(driver, `tab-row-${tabId}`, 1)
    }
    const snapshots = await getTabsByUrls(driver, [urlA, urlB])
    expect(snapshots).toHaveLength(2)
    expect(snapshots.every((tab) => tab.groupId === -1)).toBe(true)
  })

  it('moves only same-container tabs to a new window and preserves their container', async () => {
    const urls = uniqueUrls('container-move', 3)
    const fixture = await executeInExtension(
      driver,
      async (urls) => {
        const identity = await browser.contextualIdentities.create({
          name: 'Firefox CI container',
          color: 'blue',
          icon: 'briefcase',
        })
        const tabs = []
        for (const url of urls.slice(0, 2)) {
          tabs.push(
            await browser.tabs.create({
              url,
              cookieStoreId: identity.cookieStoreId,
              active: false,
            }),
          )
        }
        const other = await browser.tabs.create({ url: urls[2], active: false })
        return {
          cookieStoreId: identity.cookieStoreId,
          tabIds: tabs.map((tab) => tab.id),
          otherId: other.id,
          originalWindowId: other.windowId,
        }
      },
      urls,
    )

    try {
      await driver.get(extensionURL)
      const row = await waitForCss(
        driver,
        `[data-testid="tab-row-${fixture.tabIds[0]}"]`,
      )
      await driver.actions({ async: true }).contextClick(row).perform()
      const move = await driver.wait(
        until.elementLocated(
          By.xpath(
            '//*[@role="menuitem" and contains(., "Open same container tabs in a new window")]',
          ),
        ),
        30000,
      )
      await move.click()

      await driver.wait(async () => {
        const tabs = await executeInExtension(
          driver,
          async (cookieStoreId) => browser.tabs.query({ cookieStoreId }),
          fixture.cookieStoreId,
        )
        // A tab may briefly be absent from tabs.get() while Firefox adopts it
        // into the new window. Wait for a complete snapshot with the same IDs.
        return (
          tabs.length === fixture.tabIds.length &&
          tabs.every(
            (tab) =>
              fixture.tabIds.includes(tab.id) &&
              tab.windowId !== fixture.originalWindowId,
          )
        )
      }, 30000)
      const state = await executeInExtension(
        driver,
        async ({ tabIds, otherId }) => ({
          tabs: await Promise.all(tabIds.map((id) => browser.tabs.get(id))),
          other: await browser.tabs.get(otherId),
        }),
        fixture,
      )
      expect(new Set(state.tabs.map((tab) => tab.windowId)).size).toBe(1)
      expect(
        state.tabs.every((tab) => tab.cookieStoreId === fixture.cookieStoreId),
      ).toBe(true)
      expect(state.other.windowId).toBe(fixture.originalWindowId)
      expect(state.other.cookieStoreId).not.toBe(fixture.cookieStoreId)
    } finally {
      await executeInExtension(
        driver,
        async (cookieStoreId) => {
          await browser.contextualIdentities.remove(cookieStoreId)
        },
        fixture.cookieStoreId,
      )
    }
  })
})
