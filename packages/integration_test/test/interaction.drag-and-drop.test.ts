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

const readFocusedTestId = async (page: Page) =>
  await page.evaluate(
    () => document.activeElement?.getAttribute('data-testid') || '',
  )

const focusByKeyboardUntil = async (
  page: Page,
  predicate: (testId: string) => boolean,
  maxSteps = 60,
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

const readSelectedCountState = async (page: Page) =>
  await page.evaluate(() => {
    const text =
      Array.from(document.querySelectorAll('p')).find((node) =>
        /selected/.test(node.textContent || ''),
      )?.textContent || ''
    const match = text.match(/,\s*(\d+)\s+tabs?\s+selected/i)
    return match ? Number(match[1]) : -1
  })

const createWindowWithUrls = async (page: Page, urls: string[]) =>
  await page.evaluate(async (urlsToCreate) => {
    if (urlsToCreate.length === 0) {
      return null
    }

    const createdWindow = await chrome.windows.create({
      url: urlsToCreate[0],
      focused: false,
    })
    const windowId = createdWindow.id
    if (typeof windowId !== 'number') {
      return null
    }

    for (const url of urlsToCreate.slice(1)) {
      await chrome.tabs.create({
        windowId,
        url,
        active: false,
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 600))
    const tabs = (await chrome.tabs.query({ windowId })).sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0),
    )
    const tabIdsByUrl = tabs.reduce(
      (acc, tab) => {
        if (tab.url && typeof tab.id === 'number') {
          acc[tab.url] = tab.id
        }
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      windowId,
      tabIdsByUrl,
    }
  }, urls)

const groupTabsInWindowByUrls = async (
  page: Page,
  {
    windowId,
    urls,
    title = '',
    color = 'blue',
  }: {
    windowId: number
    urls: string[]
    title?: string
    color?: string
  },
) =>
  await page.evaluate(
    async ({ windowId, urlsToGroup, title, color }) => {
      const tabs = (await chrome.tabs.query({ windowId })).sort(
        (a, b) => (a.index ?? 0) - (b.index ?? 0),
      )
      const tabIds = urlsToGroup.map(
        (url) => tabs.find((tab) => tab.url === url)?.id ?? -1,
      )
      if (tabIds.some((id) => id < 0)) {
        return null
      }

      const groupId = await chrome.tabs.group({ tabIds })
      await chrome.tabGroups.update(groupId, {
        title,
        color,
      })
      await new Promise((resolve) => setTimeout(resolve, 300))
      return groupId
    },
    { windowId, urlsToGroup: urls, title, color },
  )

const readTabsInWindow = async (page: Page, windowId: number) =>
  await page.evaluate(async (targetWindowId) => {
    const tabs = (await chrome.tabs.query({ windowId: targetWindowId })).sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0),
    )
    return tabs.map((tab) => ({
      id: tab.id ?? -1,
      url: tab.url || '',
      groupId: tab.groupId,
      windowId: tab.windowId ?? -1,
      index: tab.index ?? -1,
    }))
  }, windowId)

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

  test('manually selected whole group dropped into another window blank space keeps the group', async () => {
    const sourceUrls = [
      'data:text/html,whole-group-source-a',
      'data:text/html,whole-group-source-b',
    ]
    const targetUrl = 'data:text/html,whole-group-target'

    const sourceWindow = await createWindowWithUrls(page, sourceUrls)
    const targetWindow = await createWindowWithUrls(page, [targetUrl])
    expect(sourceWindow).toBeTruthy()
    expect(targetWindow).toBeTruthy()
    if (!sourceWindow || !targetWindow) {
      return
    }

    const groupId = await groupTabsInWindowByUrls(page, {
      windowId: sourceWindow.windowId,
      urls: sourceUrls,
      title: 'Whole Group',
      color: 'blue',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)
    await waitForTestId(
      page,
      `window-drop-zone-bottom-${targetWindow.windowId}`,
    )

    await focusByKeyboardUntil(
      page,
      (testId) => testId === `tab-group-header-${groupId}`,
      60,
    )
    await page.keyboard.press('x')
    await expect.poll(() => readSelectedCountState(page)).toBe(2)

    await dragByTestId(page, {
      sourceTestId: `tab-row-${sourceWindow.tabIdsByUrl[sourceUrls[0]]}`,
      targetTestId: `window-drop-zone-bottom-${targetWindow.windowId}`,
      dropPosition: 'middle',
    })
    await page.waitForTimeout(1000)

    const movedTabs = await Promise.all(
      sourceUrls.map(async (url) => {
        const tabId = sourceWindow.tabIdsByUrl[url]
        const tab = await page.evaluate(async (id) => {
          const targetTab = await chrome.tabs.get(id)
          return targetTab
        }, tabId)
        return tab
      }),
    )
    expect(
      movedTabs.every((tab) => tab?.windowId === targetWindow.windowId),
    ).toBe(true)
    expect(movedTabs.every((tab) => tab && tab.groupId === groupId)).toBe(true)
    const targetTabs = await readTabsInWindow(page, targetWindow.windowId)
    const targetGroupTabs = targetTabs.filter((tab) => tab.groupId === groupId)
    expect(targetGroupTabs.map((tab) => tab.url)).toEqual(sourceUrls)
  })

  test('partial-group selection dropped into same-window blank space detaches selected tabs', async () => {
    const urls = [
      'data:text/html,partial-group-a',
      'data:text/html,partial-group-b',
      'data:text/html,partial-group-c',
    ]
    const setup = await createWindowWithUrls(page, urls)
    expect(setup).toBeTruthy()
    if (!setup) {
      return
    }

    const groupId = await groupTabsInWindowByUrls(page, {
      windowId: setup.windowId,
      urls: urls.slice(0, 2),
      title: 'Partial Group',
      color: 'green',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)
    await waitForTestId(page, `tab-row-${setup.tabIdsByUrl[urls[0]]}`)
    await waitForTestId(page, `window-drop-zone-bottom-${setup.windowId}`)

    await focusByKeyboardUntil(
      page,
      (testId) => testId === `tab-row-${setup.tabIdsByUrl[urls[0]]}`,
      60,
    )
    await page.keyboard.press('x')
    await expect.poll(() => readSelectedCountState(page)).toBe(1)

    await dragByTestId(page, {
      sourceTestId: `tab-row-${setup.tabIdsByUrl[urls[0]]}`,
      targetTestId: `window-drop-zone-bottom-${setup.windowId}`,
      dropPosition: 'middle',
    })
    await page.waitForTimeout(1000)

    const draggedTab = await page.evaluate(async (tabId) => {
      const tab = await chrome.tabs.get(tabId)
      return {
        id: tab.id ?? -1,
        windowId: tab.windowId ?? -1,
        groupId: tab.groupId,
        noGroup: chrome.tabGroups.TAB_GROUP_ID_NONE,
      }
    }, setup.tabIdsByUrl[urls[0]])
    expect(draggedTab.windowId).toBe(setup.windowId)
    expect(draggedTab.groupId).toBe(draggedTab.noGroup)

    const groupedTabs = await page.evaluate(async (id) => {
      const tabs = await chrome.tabs.query({ groupId: id })
      return tabs.map((tab) => tab.id ?? -1)
    }, groupId)
    expect(groupedTabs).toHaveLength(1)
  })

  test('whole group plus loose tab dropped into another window preserves the group and keeps the loose tab loose', async () => {
    const sourceUrls = [
      'data:text/html,mixed-selection-group-a',
      'data:text/html,mixed-selection-group-b',
      'data:text/html,mixed-selection-loose',
    ]
    const targetUrls = [
      'data:text/html,mixed-selection-target-a',
      'data:text/html,mixed-selection-target-b',
    ]

    const sourceWindow = await createWindowWithUrls(page, sourceUrls)
    const targetWindow = await createWindowWithUrls(page, targetUrls)
    expect(sourceWindow).toBeTruthy()
    expect(targetWindow).toBeTruthy()
    if (!sourceWindow || !targetWindow) {
      return
    }

    const sourceGroupId = await groupTabsInWindowByUrls(page, {
      windowId: sourceWindow.windowId,
      urls: sourceUrls.slice(0, 2),
      title: 'Mixed Source Group',
      color: 'orange',
    })
    expect(sourceGroupId).toBeGreaterThan(-1)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${sourceGroupId}`)
    await waitForTestId(
      page,
      `tab-row-${sourceWindow.tabIdsByUrl[sourceUrls[2]]}`,
    )
    await waitForTestId(
      page,
      `window-drop-zone-bottom-${targetWindow.windowId}`,
    )

    await focusByKeyboardUntil(
      page,
      (testId) => testId === `tab-group-header-${sourceGroupId}`,
      60,
    )
    await page.keyboard.press('x')
    await expect.poll(() => readSelectedCountState(page)).toBe(2)

    await focusByKeyboardUntil(
      page,
      (testId) =>
        testId === `tab-row-${sourceWindow.tabIdsByUrl[sourceUrls[2]]}`,
      60,
    )
    await page.keyboard.press('x')
    await expect.poll(() => readSelectedCountState(page)).toBe(3)

    await dragByTestId(page, {
      sourceTestId: `tab-row-${sourceWindow.tabIdsByUrl[sourceUrls[2]]}`,
      targetTestId: `window-drop-zone-bottom-${targetWindow.windowId}`,
      dropPosition: 'middle',
    })
    await page.waitForTimeout(1000)

    const movedTabs = await Promise.all(
      sourceUrls.map(async (url) => {
        const tabId = sourceWindow.tabIdsByUrl[url]
        const tab = await page.evaluate(async (id) => {
          const targetTab = await chrome.tabs.get(id)
          return targetTab
        }, tabId)
        return tab
      }),
    )
    expect(
      movedTabs.every((tab) => tab?.windowId === targetWindow.windowId),
    ).toBe(true)
    const preservedGroupId = movedTabs[0]?.groupId ?? -1
    expect(preservedGroupId).not.toBe(-1)
    expect(
      movedTabs.slice(0, 2).every((tab) => tab?.groupId === preservedGroupId),
    ).toBe(true)
    expect(movedTabs[2]?.groupId).toBe(-1)

    const targetTabs = await readTabsInWindow(page, targetWindow.windowId)
    const movedTargetTabs = targetTabs.filter((tab) =>
      sourceUrls.includes(tab.url),
    )
    expect(movedTargetTabs).toHaveLength(3)
  })

  test('group-header center merges the entire mixed selection into the target group', async () => {
    const sourceUrls = [
      'data:text/html,merge-source-group-a',
      'data:text/html,merge-source-group-b',
      'data:text/html,merge-source-loose',
    ]
    const targetUrls = [
      'data:text/html,merge-target-group-a',
      'data:text/html,merge-target-group-b',
    ]

    const sourceWindow = await createWindowWithUrls(page, sourceUrls)
    const targetWindow = await createWindowWithUrls(page, targetUrls)
    expect(sourceWindow).toBeTruthy()
    expect(targetWindow).toBeTruthy()
    if (!sourceWindow || !targetWindow) {
      return
    }

    const sourceGroupId = await groupTabsInWindowByUrls(page, {
      windowId: sourceWindow.windowId,
      urls: sourceUrls.slice(0, 2),
      title: 'Merge Source Group',
      color: 'purple',
    })
    const targetGroupId = await groupTabsInWindowByUrls(page, {
      windowId: targetWindow.windowId,
      urls: targetUrls,
      title: 'Merge Target Group',
      color: 'cyan',
    })
    expect(sourceGroupId).toBeGreaterThan(-1)
    expect(targetGroupId).toBeGreaterThan(-1)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${sourceGroupId}`)
    await waitForTestId(page, `tab-group-header-${targetGroupId}`)
    await waitForTestId(
      page,
      `tab-row-${sourceWindow.tabIdsByUrl[sourceUrls[2]]}`,
    )

    await focusByKeyboardUntil(
      page,
      (testId) => testId === `tab-group-header-${sourceGroupId}`,
      60,
    )
    await page.keyboard.press('x')
    await expect.poll(() => readSelectedCountState(page)).toBe(2)

    await focusByKeyboardUntil(
      page,
      (testId) =>
        testId === `tab-row-${sourceWindow.tabIdsByUrl[sourceUrls[2]]}`,
      60,
    )
    await page.keyboard.press('x')
    await expect.poll(() => readSelectedCountState(page)).toBe(3)

    await dragByTestId(page, {
      sourceTestId: `tab-row-${sourceWindow.tabIdsByUrl[sourceUrls[2]]}`,
      targetTestId: `tab-group-header-${targetGroupId}`,
      dropPosition: 'middle',
    })
    await page.waitForTimeout(1000)

    const sourceGroupTabs = await page.evaluate(async (id) => {
      const tabs = await chrome.tabs.query({ groupId: id })
      return tabs.map((tab) => ({
        id: tab.id ?? -1,
        groupId: tab.groupId,
        windowId: tab.windowId ?? -1,
        url: tab.url || '',
      }))
    }, sourceGroupId)
    expect(sourceGroupTabs).toHaveLength(0)

    const targetTabs = await page.evaluate(async (id) => {
      const tabs = (await chrome.tabs.query({ groupId: id })).sort(
        (a, b) => (a.index ?? 0) - (b.index ?? 0),
      )
      return tabs.map((tab) => ({
        id: tab.id ?? -1,
        groupId: tab.groupId,
        windowId: tab.windowId ?? -1,
        url: tab.url || '',
      }))
    }, targetGroupId)
    expect(targetTabs).toHaveLength(5)
    expect(targetTabs.every((tab) => tab.groupId === targetGroupId)).toBe(true)
    expect(
      targetTabs
        .filter((tab) => sourceUrls.includes(tab.url))
        .map((tab) => tab.url),
    ).toEqual(sourceUrls)
    expect(
      targetTabs
        .filter((tab) => targetUrls.includes(tab.url))
        .map((tab) => tab.url),
    ).toEqual(targetUrls)
  })
})
