import { copyFileSync, existsSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { execFileSync } from 'child_process'
import { Builder, By, until, WebDriver } from 'selenium-webdriver'
import firefox from 'selenium-webdriver/firefox'

export const ADDON_ID = 'tab-manager-v2@xcv58.com'
export const ADDON_UUID = '8ac5f9eb-0647-420d-ad26-fabe93273531'
export const EXTENSION_URL = `moz-extension://${ADDON_UUID}/popup.html?not_popup=1`
export const SEARCH_INPUT_SELECTOR =
  'input[placeholder*="Search your tab title or URL"]'

const FIREFOX_EXTENSION_ZIP = join(
  __dirname,
  '../../packages/extension/build/build_firefox.zip',
)

type FirefoxDriverWithAddonApi = WebDriver & {
  installAddon(path: string, temporary?: boolean): Promise<string>
}

export type FirefoxExtensionSession = {
  driver: WebDriver
  extensionURL: string
  extensionOrigin: string
  addonArchivePath: string
  addonId: string
}

export type GroupMembers = {
  windowId: number
  tabIds: number[]
  urls: string[]
}

export type TabSnapshot = {
  id: number
  index: number
  groupId: number
  windowId: number
  url: string
}

const getFirefoxBinary = () => {
  if (process.platform === 'darwin') {
    const macBinary = '/Applications/Firefox.app/Contents/MacOS/firefox'
    if (existsSync(macBinary)) {
      return macBinary
    }
  }
  try {
    return execFileSync('which', ['firefox'], {
      encoding: 'utf8',
    }).trim()
  } catch {
    return ''
  }
}

export const isFirefoxAvailable = () => !!getFirefoxBinary()

const getExtensionOrigin = (extensionURL: string) => {
  return extensionURL.replace(/\/popup\.html\?not_popup=1$/, '')
}

const createTemporaryXpi = () => {
  if (!existsSync(FIREFOX_EXTENSION_ZIP)) {
    throw new Error(
      `Firefox extension archive is missing: ${FIREFOX_EXTENSION_ZIP}. Run "pnpm --filter tab-manager-v2 zip:firefox" first.`,
    )
  }
  const archivePath = join(
    tmpdir(),
    `tab-manager-v2-firefox-e2e-${randomUUID()}.xpi`,
  )
  copyFileSync(FIREFOX_EXTENSION_ZIP, archivePath)
  return archivePath
}

export const initBrowserWithExtension =
  async (): Promise<FirefoxExtensionSession> => {
    const firefoxBinary = getFirefoxBinary()
    if (!firefoxBinary) {
      throw new Error(
        'Firefox binary not found. Install Firefox or run tests in CI where Firefox is provisioned.',
      )
    }

    const options = new firefox.Options()
    options.setBinary(firefoxBinary)
    options.setPreference(
      'extensions.webextensions.uuids',
      JSON.stringify({ [ADDON_ID]: ADDON_UUID }),
    )
    options.setPreference('xpinstall.signatures.required', false)
    options.setPreference('extensions.autoDisableScopes', 0)
    if (process.env.FIREFOX_E2E_HEADLESS !== 'false') {
      options.addArguments('-headless')
    }
    const driver = await new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .build()

    const addonArchivePath = createTemporaryXpi()
    const addonId = await (driver as FirefoxDriverWithAddonApi).installAddon(
      addonArchivePath,
      true,
    )
    await driver.get(EXTENSION_URL)
    await waitForCss(driver, SEARCH_INPUT_SELECTOR)

    return {
      driver,
      extensionURL: EXTENSION_URL,
      extensionOrigin: getExtensionOrigin(EXTENSION_URL),
      addonArchivePath,
      addonId,
    }
  }

export const closeBrowserWithExtension = async ({
  driver,
  addonArchivePath,
}: Pick<FirefoxExtensionSession, 'driver' | 'addonArchivePath'>) => {
  try {
    await driver.quit()
  } finally {
    if (existsSync(addonArchivePath)) {
      unlinkSync(addonArchivePath)
    }
  }
}

type ExtensionSerializable =
  | string
  | number
  | boolean
  | null
  | ExtensionSerializable[]
  | { [key: string]: ExtensionSerializable }

type ExtensionFn<TArgs extends ExtensionSerializable[], TResult> = (
  ...args: TArgs
) => TResult | Promise<TResult>

type ExtensionFnResult<TResult> =
  | { ok: true; value: TResult }
  | { ok: false; error: string }

export const executeInExtension = async <
  TArgs extends ExtensionSerializable[],
  TResult,
>(
  driver: WebDriver,
  fn: ExtensionFn<TArgs, TResult>,
  ...args: TArgs
): Promise<TResult> => {
  const rawResult = (await driver.executeAsyncScript(
    (
      serializedFn: string,
      fnArgs: ExtensionSerializable[],
      done: (result: ExtensionFnResult<TResult>) => void,
    ) => {
      const run = async () => {
        const runtimeFn = eval(`(${serializedFn})`) as ExtensionFn<
          ExtensionSerializable[],
          TResult
        >
        const value = await runtimeFn(...fnArgs)
        done({ ok: true, value })
      }
      run().catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error)
        done({ ok: false, error: message })
      })
    },
    fn.toString(),
    args,
  )) as ExtensionFnResult<TResult>

  if (!rawResult.ok) {
    throw new Error(
      `Extension script failed: ${(rawResult as { error: string }).error}`,
    )
  }
  return rawResult.value
}

export const waitForCss = async (
  driver: WebDriver,
  selector: string,
  timeout = 30000,
) => {
  const element = await driver.wait(
    until.elementLocated(By.css(selector)),
    timeout,
  )
  await driver.wait(until.elementIsVisible(element), timeout)
  return element
}

export const waitForText = async (
  driver: WebDriver,
  selector: string,
  expectedText: string,
  timeout = 30000,
) => {
  await driver.wait(async () => {
    const text = await driver.executeScript(
      'const el = document.querySelector(arguments[0]); return el ? el.textContent : null;',
      selector,
    )
    return typeof text === 'string' && text.includes(expectedText)
  }, timeout)
}

export const waitForTestIdCount = async (
  driver: WebDriver,
  testId: string,
  expectedCount = 1,
  timeout = 30000,
) => {
  const selector = `[data-testid="${testId}"]`
  await driver.wait(async () => {
    const count = await driver.executeScript(
      'return document.querySelectorAll(arguments[0]).length;',
      selector,
    )
    return Number(count) === expectedCount
  }, timeout)
}

export const clickByTestId = async (driver: WebDriver, testId: string) => {
  const selector = `[data-testid="${testId}"]`
  const element = await waitForCss(driver, selector)
  await element.click()
}

export const clearExtensionStorage = async (driver: WebDriver) => {
  await executeInExtension(driver, async () => {
    await browser.storage.local.clear()
    await browser.storage.sync.clear()
  })
}

export const closeNonExtensionTabs = async (
  driver: WebDriver,
  extensionOrigin: string,
) => {
  await executeInExtension(
    driver,
    async (origin) => {
      const allTabs = await browser.tabs.query({})
      const tabIdsToClose = allTabs
        .filter((tab) => !(tab.url || '').startsWith(origin))
        .map((tab) => tab.id)
        .filter((id): id is number => typeof id === 'number')
      if (tabIdsToClose.length > 0) {
        await browser.tabs.remove(tabIdsToClose)
      }
    },
    extensionOrigin,
  )
}

export const openPages = async (driver: WebDriver, urls: string[]) => {
  await executeInExtension(
    driver,
    async (pagesToOpen) => {
      for (const url of pagesToOpen) {
        await browser.tabs.create({ url, active: false })
      }
    },
    urls,
  )
}

export const groupTabsByUrl = async (
  driver: WebDriver,
  {
    urls,
    title = '',
    color = 'blue',
    windowId,
  }: {
    urls: string[]
    title?: string
    color?: string
    windowId?: number
  },
) => {
  return await executeInExtension(
    driver,
    async ({ urls, title, color, windowId }) => {
      const tabs = await browser.tabs.query(
        typeof windowId === 'number' ? { windowId } : { currentWindow: true },
      )
      const tabPool = [...tabs]
      const pickedTabIds: number[] = []
      for (const url of urls) {
        const index = tabPool.findIndex((tab) => tab.url === url)
        if (index >= 0) {
          const tab = tabPool.splice(index, 1)[0]
          if (typeof tab.id === 'number') {
            pickedTabIds.push(tab.id)
          }
        }
      }
      if (!pickedTabIds.length) {
        return -1
      }
      const groupId = await browser.tabs.group({
        tabIds: pickedTabIds,
      })
      await browser.tabGroups.update(groupId, {
        title,
        color: color as string,
      })
      return groupId
    },
    { urls, title, color, windowId },
  )
}

export const getGroupMembers = async (
  driver: WebDriver,
  groupId: number,
): Promise<GroupMembers> => {
  return await executeInExtension(
    driver,
    async (id) => {
      const tabs = await browser.tabs.query({ groupId: id })
      const sortedTabs = tabs.sort((a, b) => a.index - b.index)
      return {
        windowId: sortedTabs[0]?.windowId ?? -1,
        tabIds: sortedTabs
          .map((tab) => tab.id)
          .filter((tabId): tabId is number => typeof tabId === 'number'),
        urls: sortedTabs.map((tab) => tab.url || ''),
      }
    },
    groupId,
  )
}

export const getTabGroup = async (
  driver: WebDriver,
  groupId: number,
): Promise<{ collapsed: boolean; [key: string]: unknown }> => {
  return await executeInExtension(
    driver,
    async (id) => {
      return await browser.tabGroups.get(id)
    },
    groupId,
  )
}

export const updateTabGroup = async (
  driver: WebDriver,
  groupId: number,
  updateProperties: { [key: string]: ExtensionSerializable },
) => {
  await executeInExtension(
    driver,
    async ({ groupId, updateProperties }) => {
      await browser.tabGroups.update(
        groupId,
        updateProperties as Record<string, unknown>,
      )
    },
    { groupId, updateProperties },
  )
}

export const ungroupTabGroupById = async (
  driver: WebDriver,
  groupId: number,
) => {
  await executeInExtension(
    driver,
    async (targetGroupId) => {
      const tabs = await browser.tabs.query({ groupId: targetGroupId })
      if (!tabs.length) {
        return
      }
      const tabIds = tabs
        .map((tab) => tab.id)
        .filter((tabId): tabId is number => typeof tabId === 'number')
      await browser.tabs.ungroup(tabIds)
    },
    groupId,
  )
}

export const getTabsByUrls = async (
  driver: WebDriver,
  urls: string[],
): Promise<TabSnapshot[]> => {
  return await executeInExtension(
    driver,
    async (targetUrls) => {
      const tabs = await browser.tabs.query({ currentWindow: true })
      return tabs
        .filter((tab) => targetUrls.includes(tab.url || ''))
        .map((tab) => ({
          id: tab.id ?? -1,
          index: tab.index,
          groupId: tab.groupId ?? -1,
          windowId: tab.windowId,
          url: tab.url || '',
        }))
        .sort((a, b) => a.index - b.index)
    },
    urls,
  )
}

export const dragByTestId = async (
  driver: WebDriver,
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
  await driver.executeScript(
    (args: {
      sourceTestId: string
      targetTestId: string
      dropPosition: 'top' | 'middle' | 'bottom'
      targetUseParent: boolean
    }) => {
      const sourceNode = document.querySelector(
        `[data-testid="${args.sourceTestId}"]`,
      ) as HTMLElement | null
      const targetNode = document.querySelector(
        `[data-testid="${args.targetTestId}"]`,
      ) as HTMLElement | null
      if (!sourceNode || !targetNode) {
        return false
      }
      const source =
        (sourceNode.closest('[draggable="true"]') as HTMLElement | null) ||
        sourceNode
      const target = args.targetUseParent
        ? (targetNode.parentElement as HTMLElement | null) || targetNode
        : targetNode
      const sourceRect = source.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const sourceX = sourceRect.left + sourceRect.width / 2
      const sourceY = sourceRect.top + sourceRect.height / 2
      const targetX = targetRect.left + Math.min(16, targetRect.width / 2)
      const targetY =
        args.dropPosition === 'top'
          ? targetRect.top + 2
          : args.dropPosition === 'bottom'
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
