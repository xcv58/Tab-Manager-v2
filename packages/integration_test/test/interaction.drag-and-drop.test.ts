import { Page, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  TAB_QUERY,
  URLS,
  CLOSE_PAGES,
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
  openPages,
  matchImageSnapshotOptions,
  groupTabsByUrl,
  updateTabGroup,
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
        const dropTargetTabId = groupedTabs[2]?.id ?? -1
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
      dropPosition: 'top',
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
          groupUrls: groupTabs.map((tab) => tab.url),
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
    expect(result.groupUrls).toEqual([
      groupedUrls[0],
      groupedUrls[1],
      sourceUrl,
      groupedUrls[2],
    ])
    await expect(page.getByTestId(`tab-group-header-${groupId}`)).toHaveCount(1)
    await expect(page.getByTestId(`tab-group-count-${groupId}`)).toHaveText('4')
  })

  test('drop ungrouped tab from another window into grouped tabs should keep dropped order', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await page.waitForTimeout(600)

    const setup = await page.evaluate(async () => {
      const sourceUrl = 'data:text/html,cross-drop-source'
      const groupedUrls = [
        'data:text/html,cross-drop-group-1',
        'data:text/html,cross-drop-group-2',
        'data:text/html,cross-drop-group-3',
      ]
      const sourceWindow = await chrome.windows.create({
        url: sourceUrl,
        focused: false,
      })
      const targetWindow = await chrome.windows.create({
        url: groupedUrls[0],
        focused: false,
      })
      if (
        typeof sourceWindow.id !== 'number' ||
        typeof targetWindow.id !== 'number'
      ) {
        return null
      }

      await chrome.tabs.create({
        windowId: targetWindow.id,
        url: groupedUrls[1],
        active: false,
      })
      await chrome.tabs.create({
        windowId: targetWindow.id,
        url: groupedUrls[2],
        active: false,
      })
      await new Promise((resolve) => setTimeout(resolve, 700))

      const targetTabs = (
        await chrome.tabs.query({
          windowId: targetWindow.id,
        })
      ).sort((a, b) => a.index - b.index)
      const groupedTabIds = groupedUrls.map(
        (url) => targetTabs.find((tab) => tab.url === url)?.id ?? -1,
      )
      const groupId = await chrome.tabs.group({
        tabIds: groupedTabIds,
      })
      await chrome.tabGroups.update(groupId, {
        title: 'Cross Drop Group',
        color: 'green',
      })

      const sourceTabs = await chrome.tabs.query({
        windowId: sourceWindow.id,
      })
      const groupedTabs = (
        await chrome.tabs.query({
          groupId,
        })
      ).sort((a, b) => a.index - b.index)
      return {
        sourceUrl,
        groupedUrls,
        groupId,
        sourceWindowId: sourceWindow.id,
        targetWindowId: targetWindow.id,
        sourceTabId: sourceTabs.find((tab) => tab.url === sourceUrl)?.id ?? -1,
        dropTargetTabId: groupedTabs[2]?.id ?? -1,
      }
    })
    expect(setup).toBeTruthy()
    expect(setup!.sourceTabId).toBeGreaterThan(0)
    expect(setup!.dropTargetTabId).toBeGreaterThan(0)

    await page.waitForTimeout(700)
    await page.reload()
    await page.waitForTimeout(1200)
    await waitForTestId(page, `tab-row-${setup!.sourceTabId}`)
    await waitForTestId(page, `tab-row-${setup!.dropTargetTabId}`)

    const sourceRow = page.getByTestId(`tab-row-${setup!.sourceTabId}`)
    const targetRow = page.getByTestId(`tab-row-${setup!.dropTargetTabId}`)
    await expect(sourceRow).toHaveCount(1)
    await expect(targetRow).toHaveCount(1)

    await dragByTestId(page, {
      sourceTestId: `tab-row-${setup!.sourceTabId}`,
      targetTestId: `tab-row-${setup!.dropTargetTabId}`,
      dropPosition: 'top',
      targetUseParent: true,
    })
    await page.waitForTimeout(1200)

    const result = await page.evaluate(async (data) => {
      const sourceTab = await chrome.tabs.get(data.sourceTabId)
      const groupTabs = (
        await chrome.tabs.query({
          groupId: data.groupId,
        })
      ).sort((a, b) => a.index - b.index)
      return {
        sourceWindowId: sourceTab.windowId,
        sourceGroupId: sourceTab.groupId,
        groupedWindowId: groupTabs[0]?.windowId ?? -1,
        groupUrls: groupTabs.map((tab) => tab.url),
      }
    }, setup)

    expect(result.sourceWindowId).not.toBe(setup!.sourceWindowId)
    expect(result.sourceWindowId).toBe(result.groupedWindowId)
    expect(result.sourceGroupId).toBe(setup!.groupId)
    expect(result.groupUrls).toEqual([
      setup!.groupedUrls[0],
      setup!.groupedUrls[1],
      setup!.sourceUrl,
      setup!.groupedUrls[2],
    ])
    await expect(
      page.getByTestId(`tab-group-header-${setup!.groupId}`),
    ).toHaveCount(1)
    await expect(
      page.getByTestId(`tab-group-count-${setup!.groupId}`),
    ).toHaveText('4')
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
    // Stay within the row's lower half so the drop targets the tab row,
    // not the absolute bottom window drop zone overlay.
    const targetY = targetBox.y + targetBox.height * 0.75
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
})
