import { chromium, ChromiumBrowserContext } from 'playwright'
import { MatchImageSnapshotOptions } from 'jest-image-snapshot'
import { join } from 'path'
import { Page } from 'playwright'

export const EXTENSION_PATH = join(
  __dirname,
  '../../packages/extension/build/build_chrome',
)

export const TAB_QUERY = 'div[draggable="true"] div[tabindex="-1"]'

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
  const url = await page
    .locator('#service-workers-list div[class="url"]')
    .textContent()
  const [, , extensionId] = url.split('/')
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
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const pickedTabIds = urls
        .map((url) => tabs.find((tab) => tab.url === url))
        .filter((tab) => !!tab)
        .map((tab) => tab.id)
      if (!pickedTabIds.length) {
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
      const win = await chrome.windows.create({
        url: urls,
        focused: false,
      })
      if (typeof win.id === 'number') {
        createdWindowIds.push(win.id)
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
      const pickedTabIds = urls
        .map((url) => tabs.find((tab) => tab.url === url))
        .filter((tab) => !!tab)
        .map((tab) => tab.id)
      if (!pickedTabIds.length) {
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

export const matchImageSnapshotOptions: MatchImageSnapshotOptions = {
  failureThreshold: 0.18,
  failureThresholdType: 'percent',
}
