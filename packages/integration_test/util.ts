import { expect } from '@playwright/test'
import { chromium, ChromiumBrowserContext, Locator } from 'playwright'
import { join } from 'path'
import { Page } from 'playwright'

export const EXTENSION_PATH = join(
  __dirname,
  '../../packages/extension/build/build_chrome',
)

export const TAB_QUERY = 'div[draggable="true"] div[tabindex="-1"]'
export const WINDOW_CARD_QUERY = '[data-testid^="window-card-"]'
export const INTEGRATION_VIEWPORT = { width: 1280, height: 720 }

export const URLS = [
  'https://pinboard.in/',
  'http://xcv58.com/',
  'https://nextjs.org/',
  'https://pinboard.in/',
  'http://duckduckgo.com/',
  'https://ops-class.org/',
]

export const isExtensionURL = (url: string) =>
  url.startsWith('chrome-extension://')

export const CLOSE_PAGES = async (browserContext: ChromiumBrowserContext) => {
  const pages = (await browserContext?.pages()) || []
  for (const page of pages) {
    const url = await page.url()
    if (!isExtensionURL(url)) {
      await page.close()
    }
  }
}

export const initBrowserWithExtension = async () => {
  const userDataDir = `/tmp/test-user-data-${Math.random()}`
  const browserContext = (await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    screen: INTEGRATION_VIEWPORT,
    viewport: INTEGRATION_VIEWPORT,
    args: [
      // Follow suggestions on https://playwright.dev/docs/ci#docker
      '--disable-dev-shm-usage',
      '--ipc=host',
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  })) as ChromiumBrowserContext

  let page = await browserContext.pages()[0]
  await page.bringToFront()
  await page.goto('chrome://inspect/#extensions')
  await page.goto('chrome://inspect/#service-workers')
  const serviceWorkerUrl = page
    .locator('#service-workers-list div[class="url"]')
    .first()
  await expect(serviceWorkerUrl).toContainText('chrome-extension://', {
    timeout: 45000,
  })
  const url = await serviceWorkerUrl.textContent()
  if (!url) {
    throw new Error('Failed to resolve extension service worker URL')
  }
  const [, , extensionId] = url.split('/')
  if (!extensionId) {
    throw new Error(`Invalid extension service worker URL: ${url}`)
  }
  const extensionURL = `chrome-extension://${extensionId}/popup.html?not_popup=1`
  await page.waitForTimeout(500)
  const pages = browserContext.pages()
  page = pages.find((x) => x.url() === extensionURL)
  if (!page) {
    page = pages[0]
  }

  return { browserContext, extensionURL, page }
}

export const openPages = async (
  browserContext: ChromiumBrowserContext,
  urls: string[],
) => {
  return await Promise.all(
    urls.map(async (url) => {
      const newPage = await browserContext.newPage()
      await newPage.goto(url)
      await newPage.waitForLoadState('load')
    }),
  )
}

export const groupTabsByUrl = async (
  page: Page,
  {
    urls,
    title = '',
    color = 'blue',
  }: {
    urls: string[]
    title?: string
    color?: string
  },
) => {
  return page.evaluate(
    async ({ urls, title, color }) => {
      const allTabs = await chrome.tabs.query({})
      const requestedCounts = urls.reduce(
        (counts, url) => {
          counts[url] = (counts[url] || 0) + 1
          return counts
        },
        {} as Record<string, number>,
      )
      const tabsByWindow = new Map<number, chrome.tabs.Tab[]>()
      for (const tab of allTabs) {
        if (typeof tab.windowId !== 'number') {
          continue
        }
        const windowTabs = tabsByWindow.get(tab.windowId) || []
        windowTabs.push(tab)
        tabsByWindow.set(tab.windowId, windowTabs)
      }
      const candidateTabs = Array.from(tabsByWindow.values()).find(
        (windowTabs) => {
          const windowCounts = windowTabs.reduce(
            (counts, tab) => {
              if (tab.url && requestedCounts[tab.url]) {
                counts[tab.url] = (counts[tab.url] || 0) + 1
              }
              return counts
            },
            {} as Record<string, number>,
          )
          return Object.entries(requestedCounts).every(
            ([url, count]) => (windowCounts[url] || 0) >= count,
          )
        },
      )
      if (!candidateTabs?.length) {
        return -1
      }
      const sortedTabs = candidateTabs
        .slice()
        .sort((a, b) => (a.index || 0) - (b.index || 0))
      const usedTabIds = new Set<number>()
      const pickedTabIds = urls
        .map((url) => {
          const matchingTab = sortedTabs.find(
            (tab) =>
              typeof tab.id === 'number' &&
              !usedTabIds.has(tab.id) &&
              tab.url === url,
          )
          if (typeof matchingTab?.id !== 'number') {
            return -1
          }
          usedTabIds.add(matchingTab.id)
          return matchingTab.id
        })
        .filter((id) => id > -1)
      if (pickedTabIds.length !== urls.length) {
        return -1
      }
      const groupId = await chrome.tabs.group({
        tabIds: pickedTabIds,
      })
      await chrome.tabGroups.update(groupId, {
        title,
        color,
      })
      return groupId
    },
    { urls, title, color },
  )
}

export const createWindowsWithTabs = async (
  page: Page,
  windowsUrls: string[][],
) => {
  return page.evaluate(async (allWindowsUrls) => {
    const createdWindowIds: number[] = []
    for (const urls of allWindowsUrls) {
      const [firstUrl = 'about:blank', ...restUrls] = urls
      const win = await chrome.windows.create({
        url: firstUrl,
        focused: false,
      })
      if (typeof win.id === 'number') {
        createdWindowIds.push(win.id)
        await Promise.all(
          restUrls.map((url) =>
            chrome.tabs.create({
              windowId: win.id,
              url,
              active: false,
            }),
          ),
        )
      }
    }
    return createdWindowIds
  }, windowsUrls)
}

export const groupTabsByUrlInWindow = async (
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
) => {
  return page.evaluate(
    async ({ windowId, urls, title, color }) => {
      const tabs = await chrome.tabs.query({ windowId })
      const sortedTabs = tabs
        .slice()
        .sort((a, b) => (a.index || 0) - (b.index || 0))
      const usedTabIds = new Set<number>()
      const pickedTabIds = urls
        .map((url) => {
          const matchingTab = sortedTabs.find(
            (tab) =>
              typeof tab.id === 'number' &&
              !usedTabIds.has(tab.id) &&
              tab.url === url,
          )
          if (typeof matchingTab?.id !== 'number') {
            return -1
          }
          usedTabIds.add(matchingTab.id)
          return matchingTab.id
        })
        .filter((id) => id > -1)
      if (pickedTabIds.length !== urls.length) {
        return -1
      }
      const groupId = await chrome.tabs.group({
        tabIds: pickedTabIds,
      })
      await chrome.tabGroups.update(groupId, {
        title,
        color,
      })
      return groupId
    },
    { windowId, urls, title, color },
  )
}

export const getGroupMembers = async (page: Page, groupId: number) => {
  return page.evaluate(async (id) => {
    const tabs = await chrome.tabs.query({ groupId: id })
    const sortedTabs = tabs.sort((a, b) => a.index - b.index)
    return {
      windowId: sortedTabs[0]?.windowId ?? -1,
      tabIds: sortedTabs.map((tab) => tab.id),
      urls: sortedTabs.map((tab) => tab.url),
    }
  }, groupId)
}

export const updateTabGroup = async (
  page: Page,
  groupId: number,
  updateProperties: { [key: string]: unknown },
) => {
  return page.evaluate(
    async ({ groupId, updateProperties }) => {
      await chrome.tabGroups.update(groupId, updateProperties)
    },
    { groupId, updateProperties },
  )
}

export const ungroupTabGroup = async (page: Page, groupId: number) => {
  return page.evaluate(async (targetGroupId) => {
    const tabs = await chrome.tabs.query({
      currentWindow: true,
      groupId: targetGroupId,
    })
    if (!tabs.length) {
      return
    }
    await chrome.tabs.ungroup(tabs.map((tab) => tab.id))
  }, groupId)
}

export const ungroupTabGroupById = async (page: Page, groupId: number) => {
  return page.evaluate(async (targetGroupId) => {
    const tabs = await chrome.tabs.query({
      groupId: targetGroupId,
    })
    if (!tabs.length) {
      return
    }
    await chrome.tabs.ungroup(tabs.map((tab) => tab.id))
  }, groupId)
}

export const waitForTestId = async (page: Page, testId: string, count = 1) => {
  await page.waitForSelector(`[data-testid="${testId}"]`)
  await page.waitForFunction(
    ({ selector, count }) => {
      return document.querySelectorAll(selector).length === count
    },
    { selector: `[data-testid="${testId}"]`, count },
  )
}

export const closeCurrentWindowTabsExceptActive = async (
  page: Page,
  extensionURL?: string,
) => {
  await page.evaluate(async (expectedExtensionURL) => {
    const currentWindow = await chrome.windows.getCurrent()
    if (typeof currentWindow.id !== 'number') {
      return
    }

    const currentTab = chrome.tabs.getCurrent
      ? await chrome.tabs.getCurrent()
      : null
    const currentLocation = window.location.href
    const tabs = await chrome.tabs.query({ windowId: currentWindow.id })
    const keepTabId =
      currentTab?.id ??
      tabs.find((tab) => tab.url === currentLocation)?.id ??
      tabs.find((tab) => tab.url === expectedExtensionURL)?.id ??
      tabs.find((tab) => (tab.url || '').startsWith('chrome-extension://'))?.id

    if (typeof keepTabId !== 'number') {
      return
    }

    const tabIdsToClose = tabs
      .map((tab) => tab.id)
      .filter(
        (tabId): tabId is number =>
          typeof tabId === 'number' && tabId !== keepTabId,
      )
    if (tabIdsToClose.length > 0) {
      await chrome.tabs.remove(tabIdsToClose)
    }
  }, extensionURL)
}

export const closeNonExtensionTabs = async (
  page: Page,
  extensionURL?: string,
) => {
  const extensionOrigin = extensionURL
    ? new URL(extensionURL).origin
    : 'chrome-extension://'
  await page.evaluate(async (expectedOrigin) => {
    const tabs = await chrome.tabs.query({})
    const tabIdsToClose = tabs
      .filter((tab) => !(tab.url || '').startsWith(expectedOrigin))
      .map((tab) => tab.id)
      .filter((tabId): tabId is number => typeof tabId === 'number')
    if (tabIdsToClose.length > 0) {
      await chrome.tabs.remove(tabIdsToClose)
    }
  }, extensionOrigin)
}

export const waitForDefaultExtensionView = async (page: Page) => {
  await expect(page.locator(WINDOW_CARD_QUERY)).toHaveCount(1)
  await expect(page.locator(TAB_QUERY)).toHaveCount(1)
}

export const waitForAnimationsToFinish = async (
  target: Locator,
): Promise<void> => {
  await target.evaluate(async (node) => {
    const nextFrame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    let stableFrames = 0
    for (let i = 0; i < 180; i += 1) {
      const animations = node
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation.playState !== 'finished' &&
            animation.playState !== 'idle',
        )
      if (animations.length > 0) {
        stableFrames = 0
        await Promise.all(
          animations.map((animation) =>
            animation.finished.catch(() => undefined),
          ),
        )
      } else {
        stableFrames += 1
      }
      if (stableFrames >= 3) {
        return
      }
      await nextFrame()
    }
  })
}

type RectStabilityOptions = {
  timeout?: number
  minWidth?: number
  minHeight?: number
  stableSamples?: number
}

export const waitForLocatorRectToStabilize = async (
  target: Locator,
  {
    timeout = 3000,
    minWidth = 1,
    minHeight = 1,
    stableSamples = 2,
  }: RectStabilityOptions = {},
) => {
  let previousRect: {
    x: number
    y: number
    width: number
    height: number
  } | null = null
  let stableCount = 0

  await expect
    .poll(
      async () => {
        const rect = await target.boundingBox()
        if (!rect || rect.width < minWidth || rect.height < minHeight) {
          previousRect = null
          stableCount = 0
          return false
        }

        const currentRect = {
          x: Math.round(rect.x * 10) / 10,
          y: Math.round(rect.y * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        }
        const isStable =
          previousRect !== null &&
          Math.abs(previousRect.x - currentRect.x) < 2 &&
          Math.abs(previousRect.y - currentRect.y) < 2 &&
          Math.abs(previousRect.width - currentRect.width) < 2 &&
          Math.abs(previousRect.height - currentRect.height) < 2

        previousRect = currentRect
        stableCount = isStable ? stableCount + 1 : 0
        return stableCount >= stableSamples - 1
      },
      { timeout },
    )
    .toBe(true)
}

export const waitForSurfaceToFullyAppear = async (
  page: Page,
  surface: Locator,
): Promise<void> => {
  await expect(surface).toBeVisible()
  await waitForAnimationsToFinish(surface)
  await expect
    .poll(async () => {
      const rect = await surface.boundingBox()
      return !!rect && rect.width > 0 && rect.height > 0
    })
    .toBe(true)
  await page.waitForTimeout(150)
  await expect
    .poll(
      async () =>
        surface.evaluate((node) => {
          let current: HTMLElement | null = node as HTMLElement
          while (current) {
            const opacity = Number.parseFloat(
              window.getComputedStyle(current).opacity || '1',
            )
            if (opacity < 0.999) {
              return false
            }
            current = current.parentElement
          }
          return true
        }),
      { timeout: 3000 },
    )
    .toBe(true)
  await page.evaluate(async () => {
    if (document.fonts?.status !== 'loaded') {
      await document.fonts?.ready
    }
  })
}

export const dragByTestId = async (
  page: Page,
  {
    sourceTestId,
    targetTestId,
    dropPosition = 'middle',
    targetUseParent = false,
  }: {
    sourceTestId: string
    targetTestId: string
    dropPosition?: 'top' | 'middle' | 'bottom'
    targetUseParent?: boolean
  },
) => {
  await page.evaluate(
    ({ sourceTestId, targetTestId, dropPosition, targetUseParent }) => {
      const sourceNode = document.querySelector(
        `[data-testid="${sourceTestId}"]`,
      ) as HTMLElement | null
      const targetNode = document.querySelector(
        `[data-testid="${targetTestId}"]`,
      ) as HTMLElement | null
      if (!sourceNode || !targetNode) {
        return false
      }
      const source =
        (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
        sourceNode
      const target = targetUseParent
        ? (targetNode.parentElement as HTMLElement | null) || targetNode
        : targetNode
      const sourceRect = source.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const sourceX = sourceRect.left + sourceRect.width / 2
      const sourceY = sourceRect.top + sourceRect.height / 2
      const targetX = targetRect.left + Math.min(16, targetRect.width / 2)
      const targetY =
        dropPosition === 'top'
          ? targetRect.top + 2
          : dropPosition === 'bottom'
            ? targetRect.bottom - 2
            : targetRect.top + targetRect.height / 2

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
      target.dispatchEvent(
        new DragEvent('dragenter', {
          bubbles: true,
          cancelable: true,
          clientX: targetX,
          clientY: targetY,
          dataTransfer,
        }),
      )
      target.dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          clientX: targetX,
          clientY: targetY,
          dataTransfer,
        }),
      )
      target.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          clientX: targetX,
          clientY: targetY,
          dataTransfer,
        }),
      )
      source.dispatchEvent(
        new DragEvent('dragend', {
          bubbles: true,
          cancelable: true,
          clientX: targetX,
          clientY: targetY,
          dataTransfer,
        }),
      )
      return true
    },
    { sourceTestId, targetTestId, dropPosition, targetUseParent },
  )
}

export const matchImageSnapshotOptions = {
  maxDiffPixelRatio: 0.18,
  threshold: 0.2,
}
