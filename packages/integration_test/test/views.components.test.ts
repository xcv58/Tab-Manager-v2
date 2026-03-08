import { Page, Locator, ChromiumBrowserContext } from 'playwright'
import { test, expect } from '@playwright/test'
import {
  TAB_QUERY,
  WINDOW_CARD_QUERY,
  CLOSE_PAGES,
  closeCurrentWindowTabsExceptActive,
  initBrowserWithExtension,
  openPages,
  groupTabsByUrl,
  waitForAnimationsToFinish,
  waitForDefaultExtensionView,
  waitForLocatorRectToStabilize,
  waitForSurfaceToFullyAppear,
  waitForTestId,
} from '../util'

let page: Page
let browserContext: ChromiumBrowserContext
let extensionURL: string

const waitForDialogToFullyAppear = async (
  page: Page,
  dialog: Locator,
): Promise<void> => {
  const dialogRoot = page.locator('.MuiDialog-root').first()
  await expect(dialogRoot).toBeVisible()
  await waitForAnimationsToFinish(dialogRoot)
  await waitForSurfaceToFullyAppear(page, dialog)
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

  test('render medium tab row component', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()

    const mediumTabUrlA =
      'data:text/html,<title>Medium%20Tab%20Snapshot</title>medium-tab-snapshot-a'
    const mediumTabUrlB =
      'data:text/html,<title>Medium%20Tab%20Snapshot</title>medium-tab-snapshot-b'
    await openPages(browserContext, [mediumTabUrlA, mediumTabUrlB])
    await page.bringToFront()
    await page.waitForTimeout(800)

    const mediumTabId = await page.evaluate(async () => {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const target = tabs.find((tab) =>
        (tab.url || '').includes('medium-tab-snapshot-a'),
      )
      return target?.id ?? -1
    })
    expect(mediumTabId).toBeGreaterThan(0)
    await page.reload()
    await waitForTestId(page, `tab-row-${mediumTabId}`)

    const tabRow = page.getByTestId(`tab-row-${mediumTabId}`)
    await expect(tabRow).toBeVisible()
    await page.mouse.move(1, 1)
    await page.waitForTimeout(200)
    const tabRowScreenshot = await tabRow.screenshot()
    expect(tabRowScreenshot).toMatchSnapshot('tab-row-medium.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
  })

  test('render medium window card component', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,<title>WindowCard1</title>window-card-1',
      'data:text/html,<title>WindowCard2</title>window-card-2',
      'data:text/html,<title>WindowCard3</title>window-card-3',
    ])
    await page.bringToFront()
    await page.waitForTimeout(1000)
    await page.reload()
    await page.waitForTimeout(600)
    await expect(page.locator(WINDOW_CARD_QUERY)).toHaveCount(1)
    await expect(page.locator(TAB_QUERY)).toHaveCount(4)

    const windowCard = page.locator(WINDOW_CARD_QUERY).first()
    await expect(windowCard).toBeVisible()
    await waitForLocatorRectToStabilize(windowCard, { minHeight: 200 })
    await page.mouse.move(1, 1)
    await page.waitForTimeout(150)
    const windowCardScreenshot = await windowCard.screenshot()
    expect(windowCardScreenshot).toMatchSnapshot('window-card-medium.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    const windowTitle = windowCard.locator('[data-testid^="window-title-"]')
    await expect(windowTitle).toBeVisible()
    await windowTitle.hover()
    await page.waitForTimeout(150)
    await waitForLocatorRectToStabilize(windowCard, { minHeight: 200 })
    const hoveredWindowCardScreenshot = await windowCard.screenshot()
    expect(hoveredWindowCardScreenshot).toMatchSnapshot(
      'window-card-hovered-state.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
  })

  test('render medium toolbar strip component', async () => {
    await page.evaluate(async () => {
      await chrome.storage.sync.set({
        toolbarAutoHide: false,
      })
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,<title>Toolbar1</title>toolbar-1',
      'data:text/html,<title>Toolbar2</title>toolbar-2',
    ])
    await page.bringToFront()
    await page.waitForTimeout(900)
    await page.reload()
    await page.waitForTimeout(500)

    const toolbar = page.locator('.toolbar').first()
    await expect(toolbar).toBeVisible()
    const toolbarScreenshot = await toolbar.screenshot()
    expect(toolbarScreenshot).toMatchSnapshot('toolbar-strip-medium.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
  })

  test('render medium settings dialog component', async () => {
    await page.evaluate(async () => {
      await chrome.storage.sync.set({
        toolbarAutoHide: false,
      })
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,<title>Settings</title>settings',
    ])
    await page.bringToFront()
    await page.waitForTimeout(700)

    const settingsButton = page.locator('button[aria-label="Settings"]').first()
    await expect(settingsButton).toBeVisible()
    await settingsButton.click()
    const settingsDialog = page.locator('.MuiDialog-paper').first()
    await waitForDialogToFullyAppear(page, settingsDialog)
    const settingsDialogScreenshot = await settingsDialog.screenshot({
      animations: 'disabled',
    })
    expect(settingsDialogScreenshot).toMatchSnapshot(
      'settings-dialog-medium.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  })

  test('render dnd row and window drop indicators', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,dnd-source',
      'data:text/html,dnd-target',
      'data:text/html,dnd-extra',
    ])
    await page.bringToFront()
    await page.waitForTimeout(900)

    const ids = await page.evaluate(async () => {
      const tabs = (
        await chrome.tabs.query({
          currentWindow: true,
        })
      )
        .filter((tab) => !(tab.url || '').startsWith('chrome-extension://'))
        .sort((a, b) => a.index - b.index)
      return {
        sourceId: tabs[0]?.id ?? -1,
        targetId: tabs[1]?.id ?? -1,
        winId: tabs[0]?.windowId ?? -1,
      }
    })
    expect(ids.sourceId).toBeGreaterThan(0)
    expect(ids.targetId).toBeGreaterThan(0)
    expect(ids.winId).toBeGreaterThan(0)
    await page.reload()
    await waitForTestId(page, `tab-row-${ids.sourceId}`)
    await waitForTestId(page, `tab-row-${ids.targetId}`)
    await waitForTestId(page, `window-drop-zone-top-${ids.winId}`)
    await waitForTestId(page, `window-drop-zone-bottom-${ids.winId}`)

    const targetRow = page.getByTestId(`tab-row-${ids.targetId}`)
    const targetDraggable = targetRow.locator(
      'xpath=ancestor::*[@draggable="true"][1]',
    )

    await page.evaluate(
      ({ sourceId, targetId, position }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        const targetNode = document.querySelector(
          `[data-testid="tab-row-${targetId}"]`,
        ) as HTMLElement | null
        if (!sourceNode || !targetNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        const dropTarget =
          (targetNode.parentElement as HTMLElement | null) || targetNode
        const sourceRect = source.getBoundingClientRect()
        const targetRect = dropTarget.getBoundingClientRect()
        const sourceX = sourceRect.left + sourceRect.width / 2
        const sourceY = sourceRect.top + sourceRect.height / 2
        const targetX = targetRect.left + Math.min(16, targetRect.width / 2)
        const targetY =
          position === 'before' ? targetRect.top + 2 : targetRect.bottom - 2
        const dataTransfer = new DataTransfer()
        source.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            dataTransfer,
          }),
        )
        dropTarget.dispatchEvent(
          new DragEvent('dragenter', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        dropTarget.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        return true
      },
      { sourceId: ids.sourceId, targetId: ids.targetId, position: 'before' },
    )
    await expect(targetDraggable.locator('hr').first()).toBeVisible()
    const beforeIndicator = await targetDraggable.screenshot()
    expect(beforeIndicator).toMatchSnapshot('dnd-row-indicator-before.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    await page.evaluate(
      ({ sourceId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        if (!sourceNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        source.dispatchEvent(
          new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer(),
          }),
        )
        return true
      },
      { sourceId: ids.sourceId },
    )

    await page.evaluate(
      ({ sourceId, targetId, position }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        const targetNode = document.querySelector(
          `[data-testid="tab-row-${targetId}"]`,
        ) as HTMLElement | null
        if (!sourceNode || !targetNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        const dropTarget =
          (targetNode.parentElement as HTMLElement | null) || targetNode
        const sourceRect = source.getBoundingClientRect()
        const targetRect = dropTarget.getBoundingClientRect()
        const sourceX = sourceRect.left + sourceRect.width / 2
        const sourceY = sourceRect.top + sourceRect.height / 2
        const targetX = targetRect.left + Math.min(16, targetRect.width / 2)
        const targetY =
          position === 'before' ? targetRect.top + 2 : targetRect.bottom - 2
        const dataTransfer = new DataTransfer()
        source.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            dataTransfer,
          }),
        )
        dropTarget.dispatchEvent(
          new DragEvent('dragenter', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        dropTarget.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        return true
      },
      { sourceId: ids.sourceId, targetId: ids.targetId, position: 'after' },
    )
    await expect(targetDraggable.locator('hr').first()).toBeVisible()
    const afterIndicator = await targetDraggable.screenshot()
    expect(afterIndicator).toMatchSnapshot('dnd-row-indicator-after.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    await page.evaluate(
      ({ sourceId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        if (!sourceNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        source.dispatchEvent(
          new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer(),
          }),
        )
        return true
      },
      { sourceId: ids.sourceId },
    )

    const topZone = page.getByTestId(`window-drop-zone-top-${ids.winId}`)
    await page.evaluate(
      ({ sourceId, winId, position }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        const zoneNode = document.querySelector(
          `[data-testid="window-drop-zone-${position}-${winId}"]`,
        ) as HTMLElement | null
        if (!sourceNode || !zoneNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        const sourceRect = source.getBoundingClientRect()
        const zoneRect = zoneNode.getBoundingClientRect()
        const sourceX = sourceRect.left + sourceRect.width / 2
        const sourceY = sourceRect.top + sourceRect.height / 2
        const targetX = zoneRect.left + zoneRect.width / 2
        const targetY = zoneRect.top + zoneRect.height / 2
        const dataTransfer = new DataTransfer()
        source.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragenter', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        return true
      },
      { sourceId: ids.sourceId, winId: ids.winId, position: 'top' },
    )
    await expect(topZone.locator('hr')).toHaveCount(1)
    const topZoneIndicator = await topZone.screenshot()
    expect(topZoneIndicator).toMatchSnapshot(
      'dnd-window-zone-top-indicator.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
    await page.evaluate(
      ({ sourceId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        if (!sourceNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        source.dispatchEvent(
          new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer(),
          }),
        )
        return true
      },
      { sourceId: ids.sourceId },
    )

    const bottomZone = page.getByTestId(`window-drop-zone-bottom-${ids.winId}`)
    await page.evaluate(
      ({ sourceId, winId, position }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        const zoneNode = document.querySelector(
          `[data-testid="window-drop-zone-${position}-${winId}"]`,
        ) as HTMLElement | null
        if (!sourceNode || !zoneNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        const sourceRect = source.getBoundingClientRect()
        const zoneRect = zoneNode.getBoundingClientRect()
        const sourceX = sourceRect.left + sourceRect.width / 2
        const sourceY = sourceRect.top + sourceRect.height / 2
        const targetX = zoneRect.left + zoneRect.width / 2
        const targetY = zoneRect.top + zoneRect.height / 2
        const dataTransfer = new DataTransfer()
        source.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragenter', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        return true
      },
      { sourceId: ids.sourceId, winId: ids.winId, position: 'bottom' },
    )
    await expect(bottomZone.locator('hr')).toHaveCount(1)
    const bottomZoneIndicator = await bottomZone.screenshot()
    expect(bottomZoneIndicator).toMatchSnapshot(
      'dnd-window-zone-bottom-indicator.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
    await page.evaluate(
      ({ sourceId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        if (!sourceNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        source.dispatchEvent(
          new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer(),
          }),
        )
        return true
      },
      { sourceId: ids.sourceId },
    )
  })

  test('render drag preview for single tab and group drag', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,drag-preview-1',
      'data:text/html,drag-preview-2',
      'data:text/html,drag-preview-3',
    ])
    await page.bringToFront()
    await page.waitForTimeout(900)

    const groupId = await groupTabsByUrl(page, {
      urls: ['data:text/html,drag-preview-2', 'data:text/html,drag-preview-3'],
      title: 'Preview Group',
      color: 'purple',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(700)

    const sourceState = await page.evaluate(async () => {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const source = tabs.find((tab) =>
        (tab.url || '').includes('drag-preview-1'),
      )
      return {
        sourceTabId: source?.id ?? -1,
        windowId: source?.windowId ?? -1,
      }
    })
    expect(sourceState.sourceTabId).toBeGreaterThan(0)
    expect(sourceState.windowId).toBeGreaterThan(0)
    await page.reload()
    await waitForTestId(page, `tab-row-${sourceState.sourceTabId}`)
    await waitForTestId(page, `tab-group-header-${groupId}`)
    await waitForTestId(page, `window-drop-zone-top-${sourceState.windowId}`)

    await page.evaluate(
      ({ sourceId, targetZoneTestId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        const zoneNode = document.querySelector(
          `[data-testid="${targetZoneTestId}"]`,
        ) as HTMLElement | null
        if (!sourceNode || !zoneNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        const sourceRect = source.getBoundingClientRect()
        const zoneRect = zoneNode.getBoundingClientRect()
        const sourceX = sourceRect.left + sourceRect.width / 2
        const sourceY = sourceRect.top + sourceRect.height / 2
        const targetX = zoneRect.left + zoneRect.width / 2
        const targetY = zoneRect.top + zoneRect.height / 2
        const dataTransfer = new DataTransfer()
        source.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragenter', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        return true
      },
      {
        sourceId: sourceState.sourceTabId,
        targetZoneTestId: `window-drop-zone-top-${sourceState.windowId}`,
      },
    )
    const singlePreviewHead = page
      .locator('h3')
      .filter({ hasText: '1 tab' })
      .first()
    await expect(singlePreviewHead).toBeVisible()
    const singlePreview = await singlePreviewHead
      .locator('xpath=..')
      .screenshot()
    expect(singlePreview).toMatchSnapshot('drag-preview-single-tab.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    await page.evaluate(
      ({ sourceId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-row-${sourceId}"]`,
        ) as HTMLElement | null
        if (!sourceNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        source.dispatchEvent(
          new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer(),
          }),
        )
        return true
      },
      { sourceId: sourceState.sourceTabId },
    )

    await page.getByTestId(`tab-group-header-${groupId}`).hover()
    const groupHandle = page.getByTestId(`tab-group-drag-handle-${groupId}`)
    await expect(groupHandle).toBeVisible()
    await page.evaluate(
      ({ groupId, targetZoneTestId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-group-drag-handle-${groupId}"]`,
        ) as HTMLElement | null
        const zoneNode = document.querySelector(
          `[data-testid="${targetZoneTestId}"]`,
        ) as HTMLElement | null
        if (!sourceNode || !zoneNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        const sourceRect = source.getBoundingClientRect()
        const zoneRect = zoneNode.getBoundingClientRect()
        const sourceX = sourceRect.left + sourceRect.width / 2
        const sourceY = sourceRect.top + sourceRect.height / 2
        const targetX = zoneRect.left + zoneRect.width / 2
        const targetY = zoneRect.top + zoneRect.height / 2
        const dataTransfer = new DataTransfer()
        source.dispatchEvent(
          new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragenter', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        zoneNode.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: targetX,
            clientY: targetY,
            dataTransfer,
          }),
        )
        return true
      },
      {
        groupId,
        targetZoneTestId: `window-drop-zone-top-${sourceState.windowId}`,
      },
    )
    const groupPreviewHead = page
      .locator('h3')
      .filter({ hasText: '2 tabs' })
      .first()
    await expect(groupPreviewHead).toBeVisible()
    const groupPreview = await groupPreviewHead.locator('xpath=..').screenshot()
    expect(groupPreview).toMatchSnapshot('drag-preview-group-tabs.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
    await page.evaluate(
      ({ groupId }) => {
        const sourceNode = document.querySelector(
          `[data-testid="tab-group-drag-handle-${groupId}"]`,
        ) as HTMLElement | null
        if (!sourceNode) {
          return false
        }
        const source =
          (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
          sourceNode
        source.dispatchEvent(
          new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer(),
          }),
        )
        return true
      },
      { groupId },
    )
  })

  test('render group header state variants', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
      await chrome.windows.create({
        url: 'data:text/html,group-header-move-target',
        focused: false,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,gh-state-a',
      'data:text/html,gh-state-b',
      'data:text/html,gh-state-c',
    ])
    await page.bringToFront()
    await page.waitForTimeout(900)

    const groupId = await groupTabsByUrl(page, {
      urls: [
        'data:text/html,gh-state-a',
        'data:text/html,gh-state-b',
        'data:text/html,gh-state-c',
      ],
      title: 'Header States',
      color: 'orange',
    })
    expect(groupId).toBeGreaterThan(-1)
    await page.waitForTimeout(700)
    await page.reload()
    await waitForTestId(page, `tab-group-header-${groupId}`)

    await page.getByTestId(`tab-group-toggle-${groupId}`).click()
    await page.waitForTimeout(500)
    const queryInput = page.locator('input[placeholder*="Search tabs or URLs"]')
    await queryInput.fill('gh-state-b')
    await page.waitForTimeout(500)

    const header = page.getByTestId(`tab-group-header-${groupId}`)
    await expect(page.getByTestId(`tab-group-count-${groupId}`)).toHaveText(
      '1/3',
    )
    const collapsedHeader = await header.screenshot()
    expect(collapsedHeader).toMatchSnapshot(
      'group-header-collapsed-matched-count.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )

    await page.getByTestId(`tab-group-menu-${groupId}`).click()
    const groupMenu = page.locator('.MuiPopover-root .MuiPaper-root').last()
    await waitForSurfaceToFullyAppear(page, groupMenu)
    const groupMenuScreenshot = await groupMenu.screenshot({
      animations: 'disabled',
    })
    expect(groupMenuScreenshot).toMatchSnapshot('group-header-menu-open.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })
  })

  test('render tab row state variants', async () => {
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        query: '',
        showUnmatchedTab: true,
      })
    })
    await page.reload()
    await openPages(browserContext, [
      'data:text/html,dup-row-state',
      'data:text/html,dup-row-state',
      'data:text/html,pinned-row-state',
      'data:text/html,unmatched-row-state',
    ])
    await page.bringToFront()
    await page.waitForTimeout(900)

    const ids = await page.evaluate(async () => {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const duplicated = tabs.find((tab) =>
        (tab.url || '').includes('dup-row-state'),
      )
      const pinned = tabs.find((tab) =>
        (tab.url || '').includes('pinned-row-state'),
      )
      const unmatched = tabs.find((tab) =>
        (tab.url || '').includes('unmatched-row-state'),
      )
      if (pinned?.id) {
        await chrome.tabs.update(pinned.id, { pinned: true })
      }
      return {
        duplicatedId: duplicated?.id ?? -1,
        pinnedId: pinned?.id ?? -1,
        unmatchedId: unmatched?.id ?? -1,
      }
    })
    expect(ids.duplicatedId).toBeGreaterThan(0)
    expect(ids.pinnedId).toBeGreaterThan(0)
    expect(ids.unmatchedId).toBeGreaterThan(0)

    await page.reload()
    await waitForTestId(page, `tab-row-${ids.duplicatedId}`)
    await waitForTestId(page, `tab-row-${ids.pinnedId}`)
    await waitForTestId(page, `tab-row-${ids.unmatchedId}`)

    const queryInput = page.locator('input[placeholder*="Search tabs or URLs"]')
    await queryInput.fill('pinned-row-state')
    await page.waitForTimeout(500)

    const pinnedRow = page.getByTestId(`tab-row-${ids.pinnedId}`)
    const pinnedShot = await pinnedRow.screenshot()
    expect(pinnedShot).toMatchSnapshot('tab-row-state-pinned.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    const duplicatedRow = page.getByTestId(`tab-row-${ids.duplicatedId}`)
    const duplicatedShot = await duplicatedRow.screenshot()
    expect(duplicatedShot).toMatchSnapshot('tab-row-state-duplicated.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    const unmatchedRow = page.getByTestId(`tab-row-${ids.unmatchedId}`)
    await expect(unmatchedRow).toHaveClass(/opacity-25/)
    const unmatchedShot = await unmatchedRow.screenshot()
    expect(unmatchedShot).toMatchSnapshot('tab-row-state-unmatched.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const selectButton = pinnedRow
      .locator('[aria-label="Toggle select"]')
      .first()
    await selectButton.click({ force: true })
    const selectedBackground = await pinnedRow.evaluate(
      (node) => (node as HTMLElement).style.backgroundColor,
    )
    expect(selectedBackground).toMatch(
      /rgba\(26, 115, 232, 0\.14\)|rgba\(181, 199, 230, 0\.2\)/,
    )
    const selectedShot = await pinnedRow.screenshot()
    expect(selectedShot).toMatchSnapshot('tab-row-state-selected.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    const focusButton = unmatchedRow
      .locator('[aria-label="Toggle select"]')
      .first()
    await focusButton.focus()
    const focusedControlShot = await focusButton.screenshot()
    expect(focusedControlShot).toMatchSnapshot(
      'tab-row-state-focused-control.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )

    const focusRowButton = unmatchedRow.getByRole('button', {
      name: /unmatched-row-state/i,
    })
    await focusRowButton.focus()
    await unmatchedRow.focus()
    await expect(unmatchedRow).toBeFocused()
    const focusedRowShot = await unmatchedRow.screenshot()
    expect(focusedRowShot).toMatchSnapshot('tab-row-state-focused-row.png', {
      maxDiffPixelRatio: 0.12,
      threshold: 0.2,
    })

    const toggleThemeButton = page
      .locator('[aria-label="Toggle light/dark theme"]')
      .first()
    await toggleThemeButton.click()
    await page.waitForTimeout(600)
    await unmatchedRow.focus()
    await expect(unmatchedRow).toBeFocused()
    const focusedRowDarkShot = await unmatchedRow.screenshot()
    expect(focusedRowDarkShot).toMatchSnapshot(
      'tab-row-state-focused-row-dark.png',
      {
        maxDiffPixelRatio: 0.12,
        threshold: 0.2,
      },
    )
  })
})
