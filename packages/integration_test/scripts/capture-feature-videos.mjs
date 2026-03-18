#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT_DIR =
  process.env.CAPTURE_ROOT_DIR ||
  fileURLToPath(new URL('../../..', import.meta.url))
const EXTENSION_PATH = join(ROOT_DIR, 'packages/extension/build/build_chrome')
const OUTPUT_DIR = join(ROOT_DIR, '.tmp/video-captures')
const MP4_DIR = join(OUTPUT_DIR, 'mp4')
const WORK_DIR = join(OUTPUT_DIR, 'screencast-work')
const REQUESTED_CLIPS = new Set(
  String(process.env.FEATURE_VIDEO_CLIPS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)

const VIEWPORT = { width: 1280, height: 800 }
const CAPTURE_FPS = 25
const UI_READY_TIMEOUT_MS = 120000
const UI_SETTLE_DELAY_MS = 700
const NAVIGATION_TIMEOUT_MS = 120000
const TAB_LOAD_TIMEOUT_MS = 90000
const TAB_LOAD_POLL_INTERVAL_MS = 250
const TAB_LOAD_STABLE_POLLS = 4
const TAB_POST_LOAD_SETTLE_DELAY_MS = 1800
const TAB_CREATE_BATCH_SIZE = 6
const TAB_CREATE_BATCH_DELAY_MS = 2500
const DEMO_CURSOR_MOVE_MULTIPLIER = 0.62
const DEMO_MICRO_PAUSE_MULTIPLIER = 0.58
const DEMO_HOLD_MULTIPLIER = 0.82
const DEMO_TYPE_DELAY_MULTIPLIER = 0.72
const INTERSTITIAL_TITLE_SNIPPETS = [
  'just a moment',
  'are you a robot',
  'attention required',
  'checking your browser',
  'please wait',
]

const DEFAULT_SETTINGS = {
  showAppWindow: false,
  showShortcutHint: true,
  showUnmatchedTab: true,
  litePopupMode: false,
  toolbarAutoHide: false,
  highlightDuplicatedTab: true,
  showTabTooltip: true,
  preserveSearch: true,
  searchHistory: false,
  showUrl: true,
  autoFocusSearch: false,
  ignoreHash: false,
  useSystemTheme: false,
  darkTheme: false,
  tabWidth: 20,
  showTabIcon: true,
  fontSize: 14,
}

const REAL_URLS = {
  'brand/jenny-home': 'https://jenny.media/',
  'brand/jenny-short': 'https://s.jenny.media/',
  'brand/jenny-youtube': 'https://www.youtube.com/@JennyTV1',
  'launch/final-checklist': 'https://github.com/',
  'launch/release-roadmap': 'https://developer.chrome.com/',
  'launch/store-copy': 'https://developer.mozilla.org/',
  'launch/support-plan': 'https://vercel.com/',
  'launch/qa-signoff': 'https://react.dev/',
  'launch/rollout-plan': 'https://nodejs.org/',
  'research/tab-groups-api':
    'https://developer.chrome.com/docs/extensions/',
  'research/firefox-parity': 'https://extensionworkshop.com/',
  'research/edge-review':
    'https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/',
  'research/keyboard-flows': 'https://playwright.dev/',
  'research/ux-followups': 'https://vite.dev/',
  'reading/design-refresh': 'https://www.smashingmagazine.com/',
  'reading/accessibility-audit': 'https://web.dev/',
  'reading/changelog-draft': 'https://css-tricks.com/',
  'support/customer-4821': 'https://www.reuters.com/',
  'support/customer-5104': 'https://apnews.com/',
  'support/release-mail': 'https://www.reddit.com/r/chrome_extensions/',
  'support/docs-ticket':
    'https://developer.chrome.com/docs/extensions/get-started/',
}

const SCALE_DEMO_URL_KEYS = [
  'brand/jenny-home',
  'brand/jenny-short',
  'brand/jenny-youtube',
  'launch/final-checklist',
  'launch/release-roadmap',
  'launch/store-copy',
  'launch/support-plan',
  'launch/qa-signoff',
  'launch/rollout-plan',
  'research/tab-groups-api',
  'research/firefox-parity',
  'research/edge-review',
  'research/keyboard-flows',
  'research/ux-followups',
  'reading/accessibility-audit',
  'support/docs-ticket',
]

const REVERSED_SCALE_DEMO_URL_KEYS = [...SCALE_DEMO_URL_KEYS].reverse()

function realUrl(key) {
  const url = REAL_URLS[key]
  if (!url) {
    throw new Error(`Missing real url mapping for ${key}`)
  }
  return url
}

function buildRepeatedRealUrls(keys, rounds) {
  return Array.from({ length: rounds }, (_, round) => {
    const orderedKeys = round % 2 === 0 ? keys : [...keys].reverse()
    return orderedKeys.map((key) => realUrl(key))
  }).flat()
}

function createSeededRandom(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

function buildWeightedTabCounts(totalTabs, windowCount, minimumTabsPerWindow, seed) {
  if (windowCount <= 0) {
    return []
  }
  if (minimumTabsPerWindow * windowCount > totalTabs) {
    throw new Error('Minimum tabs per window exceeds the requested total')
  }

  const random = createSeededRandom(seed)
  const weights = Array.from({ length: windowCount }, () => 0.35 + random())
  const extraTabs = totalTabs - minimumTabsPerWindow * windowCount
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const rawExtras = weights.map((weight) => (weight / totalWeight) * extraTabs)

  const counts = rawExtras.map(
    (rawExtra) => minimumTabsPerWindow + Math.floor(rawExtra),
  )
  let remainingTabs = totalTabs - counts.reduce((sum, count) => sum + count, 0)

  const remainderOrder = rawExtras
    .map((rawExtra, index) => ({
      index,
      fraction: rawExtra - Math.floor(rawExtra),
      tieBreaker: random(),
    }))
    .sort(
      (left, right) =>
        right.fraction - left.fraction || right.tieBreaker - left.tieBreaker,
    )

  for (let index = 0; index < remainingTabs; index += 1) {
    counts[remainderOrder[index % remainderOrder.length].index] += 1
  }

  return counts
}

function buildScaleDemoWindowTabs(tabCount, windowIndex = 0, resolveUrl = realUrl) {
  const keyCount = SCALE_DEMO_URL_KEYS.length

  return Array.from({ length: tabCount }, (_, tabIndex) => {
    const cycle = Math.floor(tabIndex / keyCount)
    const localIndex = tabIndex % keyCount
    const orderedKeys =
      (cycle + windowIndex) % 2 === 0
        ? SCALE_DEMO_URL_KEYS
        : REVERSED_SCALE_DEMO_URL_KEYS
    const offset = (windowIndex * 5 + cycle * 3) % keyCount
    return resolveUrl(orderedKeys[(offset + localIndex) % keyCount])
  })
}

function buildScaleDemoWindowGroups(tabs, windowIndex) {
  if (windowIndex === 0) {
    return [
      {
        title: 'Inbox',
        color: 'blue',
        urls: tabs.slice(0, 6),
      },
      {
        title: 'Launch Pad',
        color: 'orange',
        urls: tabs.slice(6, 12),
      },
    ]
  }

  if (windowIndex === 1) {
    return [
      {
        title: 'Support',
        color: 'red',
        urls: tabs.slice(0, 10),
      },
    ]
  }

  if (windowIndex === 2) {
    return [
      {
        title: 'Research',
        color: 'green',
        urls: tabs.slice(0, 8),
      },
    ]
  }

  if (windowIndex === 3) {
    return [
      {
        title: 'Release',
        color: 'purple',
        urls: tabs.slice(0, 8),
      },
    ]
  }

  return []
}

function buildThousandTwentyFourScaleWindows(resolveUrl = realUrl) {
  const featuredWindowTabs = 256
  const distributedWindowCount = 10
  const otherWindowCounts = buildWeightedTabCounts(
    1024 - featuredWindowTabs,
    distributedWindowCount,
    40,
    1024,
  )

  return [
    ...[featuredWindowTabs, ...otherWindowCounts].map((tabCount, windowIndex) => {
      const tabs = buildScaleDemoWindowTabs(tabCount, windowIndex, resolveUrl)
      return {
        tabs,
        groups: buildScaleDemoWindowGroups(tabs, windowIndex),
      }
    }),
  ]
}

async function startLocalFixtureServer() {
  const server = await new Promise((resolve) => {
    const nextServer = createServer((req, res) => {
      const requestUrl = new URL(req.url || '/', 'http://127.0.0.1')
      const title =
        requestUrl.searchParams.get('title') || requestUrl.pathname.slice(1)
      const body =
        requestUrl.searchParams.get('body') ||
        `Local scale fixture for ${title}`

      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      })
      res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${body}</p>
      <code>${requestUrl.pathname}</code>
    </main>
  </body>
</html>`)
    })
    nextServer.listen(0, '127.0.0.1', () => resolve(nextServer))
  })

  const { port } = server.address()
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      }),
  }
}

function toFixtureTitle(key) {
  return key
    .split('/')
    .flatMap((part) => part.split('-'))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildLocalFixtureUrl(baseUrl, key) {
  const title = toFixtureTitle(key)
  const slug = key.replaceAll('/', '-')
  const body = `Synthetic stress fixture for ${title}`
  return `${baseUrl}/scale/${slug}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function scaledDemoDuration(ms, multiplier, minimum) {
  return Math.max(minimum, Math.round(ms * multiplier))
}

function paceMove(ms) {
  return scaledDemoDuration(ms, DEMO_CURSOR_MOVE_MULTIPLIER, 220)
}

function pacePause(ms) {
  return scaledDemoDuration(ms, DEMO_MICRO_PAUSE_MULTIPLIER, 70)
}

function paceHold(ms) {
  return scaledDemoDuration(ms, DEMO_HOLD_MULTIPLIER, 360)
}

function paceType(ms) {
  return scaledDemoDuration(ms, DEMO_TYPE_DELAY_MULTIPLIER, 90)
}

async function demoPause(page, ms) {
  await page.waitForTimeout(pacePause(ms))
}

async function demoHold(page, ms) {
  await page.waitForTimeout(paceHold(ms))
}

function scenarioCounts(definitions) {
  return {
    windowCount: definitions.length + 1,
    tabCount:
      definitions.reduce((sum, definition) => sum + definition.tabs.length, 0) +
      1,
  }
}

function shouldCaptureClip(clipId) {
  return REQUESTED_CLIPS.size === 0 || REQUESTED_CLIPS.has(clipId)
}

async function waitForUi(page) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('input[placeholder*="Search tabs or URLs"]', {
    timeout: UI_READY_TIMEOUT_MS,
  })
  await page.waitForTimeout(UI_SETTLE_DELAY_MS)
}

async function clearAllDemoWindows(page, fullPageUrl) {
  await page.evaluate(async (url) => {
    const currentWindow = await chrome.windows.getCurrent({ populate: true })
    const allWindows = await chrome.windows.getAll({ populate: true })

    for (const win of allWindows) {
      if (win.id === currentWindow.id) {
        continue
      }
      if (typeof win.id === 'number') {
        await chrome.windows.remove(win.id)
      }
    }

    const tabsToClose = (currentWindow.tabs || [])
      .filter((tab) => tab.url !== url)
      .map((tab) => tab.id)
      .filter((tabId) => typeof tabId === 'number')

    if (tabsToClose.length > 0) {
      await chrome.tabs.remove(tabsToClose)
    }
  }, fullPageUrl)
}

async function setSettings(page, overrides = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...overrides }
  await page.evaluate(async (nextSettings) => {
    await chrome.storage.local.set(nextSettings)
    if (chrome.storage.sync?.set) {
      await chrome.storage.sync.set(nextSettings)
    }
  }, settings)
}

async function resetScenario(page, fullPageUrl, settings = {}) {
  await page.bringToFront()
  await page.evaluate(async () => {
    await chrome.storage.local.clear()
    if (chrome.storage.sync?.clear) {
      await chrome.storage.sync.clear()
    }
  })
  await clearAllDemoWindows(page, fullPageUrl)
  await setSettings(page, settings)
  await page.goto(fullPageUrl, {
    waitUntil: 'domcontentloaded',
    timeout: NAVIGATION_TIMEOUT_MS,
  })
  await waitForUi(page)
}

async function reloadPopup(page) {
  await page.reload({
    waitUntil: 'domcontentloaded',
    timeout: NAVIGATION_TIMEOUT_MS,
  })
  await waitForUi(page)
}

async function waitForScenarioReady(page, counts) {
  await page.waitForFunction(
    async ({ expectedWindowCount, expectedTabCount }) => {
      const allWindows = await chrome.windows.getAll({ populate: true })
      const totalTabs = allWindows.reduce(
        (sum, win) => sum + (win.tabs || []).length,
        0,
      )
      return (
        allWindows.length === expectedWindowCount &&
        totalTabs === expectedTabCount
      )
    },
    {
      timeout: TAB_LOAD_TIMEOUT_MS,
      polling: TAB_LOAD_POLL_INTERVAL_MS,
    },
    {
      expectedWindowCount: counts.windowCount,
      expectedTabCount: counts.tabCount,
    },
  )
  await page.waitForTimeout(UI_SETTLE_DELAY_MS + 2000)
}

async function createDemoWindows(page, windows, waitOptionOverrides = {}) {
  return page.evaluate(
    async ({ definitions, waitOptions }) => {
      const delay = (ms) =>
        new Promise((resolve) => {
          setTimeout(resolve, ms)
        })

      const toBatches = (urls, size) => {
        const batches = []
        for (let index = 0; index < urls.length; index += size) {
          batches.push(urls.slice(index, index + size))
        }
        return batches
      }

      const waitForTabCount = async (windowId, expectedCount) => {
        for (let attempt = 0; attempt < waitOptions.maxAttempts; attempt += 1) {
          const tabs = await chrome.tabs.query({ windowId })
          if (tabs.length >= expectedCount) {
            return tabs.slice().sort((a, b) => (a.index || 0) - (b.index || 0))
          }
          await delay(waitOptions.pollIntervalMs)
        }

        const tabs = await chrome.tabs.query({ windowId })
        return tabs.slice().sort((a, b) => (a.index || 0) - (b.index || 0))
      }

      const waitForCreatedWindows = async (createdWindows) => {
        const blockedTitleSnippets = waitOptions.blockedTitleSnippets.map(
          (snippet) => snippet.toLowerCase(),
        )

        const isSettledTab = (tab) => {
          const title = String(tab.title || '').trim().toLowerCase()
          const url = String(tab.url || '').trim().toLowerCase()
          return (
            tab.status === 'complete' &&
            title.length > 0 &&
            !url.startsWith('chrome-error://') &&
            !blockedTitleSnippets.some((snippet) => title.includes(snippet))
          )
        }

        let highestLoadedCount = -1
        let stablePolls = 0

        for (let attempt = 0; attempt < waitOptions.maxAttempts; attempt += 1) {
          let hasExpectedCounts = true
          let expectedTabCount = 0
          let loadedTabCount = 0

          for (const createdWindow of createdWindows) {
            const tabs = await chrome.tabs.query({ windowId: createdWindow.id })
            expectedTabCount += createdWindow.expectedCount
            if (tabs.length !== createdWindow.expectedCount) {
              hasExpectedCounts = false
              break
            }
            loadedTabCount += tabs.filter(isSettledTab).length
          }

          if (!hasExpectedCounts) {
            await delay(waitOptions.pollIntervalMs)
            continue
          }

          if (loadedTabCount > highestLoadedCount) {
            highestLoadedCount = loadedTabCount
            stablePolls = 0
          } else {
            stablePolls += 1
          }

          if (
            loadedTabCount === expectedTabCount ||
            stablePolls >= waitOptions.stablePolls
          ) {
            await delay(waitOptions.postLoadSettleMs)
            return
          }

          await delay(waitOptions.pollIntervalMs)
        }
      }

      const createWindowWithTabs = async (urls) => {
        const batches = toBatches(urls, waitOptions.batchSize)
        const [firstBatch = [], ...restBatches] = batches
        const created = await chrome.windows.create({
          url: firstBatch,
          focused: false,
        })
        const windowId = created.id
        if (typeof windowId !== 'number') {
          throw new Error('Failed to create demo window')
        }

        let expectedCount = firstBatch.length

        if (restBatches.length > 0) {
          await delay(waitOptions.batchPauseMs)
        }

        for (const batch of restBatches) {
          for (const url of batch) {
            await chrome.tabs.create({
              windowId,
              url,
              active: false,
            })
            expectedCount += 1
          }
          await waitForTabCount(windowId, expectedCount)
          await delay(waitOptions.batchPauseMs)
        }

        const tabs = await waitForTabCount(windowId, urls.length)
        return {
          windowId,
          tabIds: tabs.map((tab) => tab.id),
          expectedCount: urls.length,
        }
      }

      const pickTabIds = (allUrls, tabIds, groupUrls) => {
        const usedIndexes = new Set()
        const picked = []

        for (const groupUrl of groupUrls) {
          const index = allUrls.findIndex(
            (url, candidateIndex) =>
              url === groupUrl && !usedIndexes.has(candidateIndex),
          )
          if (index >= 0 && typeof tabIds[index] === 'number') {
            usedIndexes.add(index)
            picked.push(tabIds[index])
          }
        }

        return picked
      }

      const createdBase = []
      for (const definition of definitions) {
        const createdWindow = await createWindowWithTabs(definition.tabs)
        createdBase.push({ definition, ...createdWindow })
      }

      const created = []
      for (const { definition, windowId, tabIds, expectedCount } of createdBase) {
        const groups = []
        for (const group of definition.groups || []) {
          const groupTabIds = pickTabIds(definition.tabs, tabIds, group.urls)
          if (groupTabIds.length !== group.urls.length) {
            throw new Error(`Failed to resolve group tabs for ${group.title}`)
          }

          const groupId = await chrome.tabs.group({
            tabIds: groupTabIds,
            createProperties: { windowId },
          })

          await chrome.tabGroups.update(groupId, {
            title: group.title,
            color: group.color,
            collapsed: !!group.collapsed,
          })

          groups.push({ groupId, title: group.title })
        }

        created.push({ windowId, tabIds, expectedCount, groups })
      }

      await waitForCreatedWindows(
        created.map((item) => ({
          id: item.windowId,
          expectedCount: item.expectedCount,
        })),
      )

      return created.map((item) => ({
        windowId: item.windowId,
        tabIds: item.tabIds,
        groups: item.groups,
      }))
    },
    {
      definitions: windows,
      waitOptions: {
        maxAttempts: Math.ceil(TAB_LOAD_TIMEOUT_MS / TAB_LOAD_POLL_INTERVAL_MS),
        pollIntervalMs: TAB_LOAD_POLL_INTERVAL_MS,
        stablePolls: TAB_LOAD_STABLE_POLLS,
        postLoadSettleMs: TAB_POST_LOAD_SETTLE_DELAY_MS,
        batchSize: TAB_CREATE_BATCH_SIZE,
        batchPauseMs: TAB_CREATE_BATCH_DELAY_MS,
        blockedTitleSnippets: INTERSTITIAL_TITLE_SNIPPETS,
        ...waitOptionOverrides,
      },
    },
  )
}

async function initControlContext() {
  const userDataDir = mkdtempSync(join(tmpdir(), 'tmv2-video-'))
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    screen: VIEWPORT,
    viewport: VIEWPORT,
    args: [
      '--disable-dev-shm-usage',
      '--ipc=host',
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  })

  const controlPage = context.pages()[0]
  await controlPage.setViewportSize(VIEWPORT)
  await controlPage.goto('chrome://inspect/#extensions')
  await controlPage.goto('chrome://inspect/#service-workers')

  const serviceWorkerUrl = controlPage
    .locator('#service-workers-list div[class="url"]')
    .first()
  await serviceWorkerUrl.waitFor({ state: 'visible', timeout: 15000 })
  const workerText = await serviceWorkerUrl.textContent()
  const [, , extensionId] = String(workerText).split('/')

  if (!extensionId) {
    throw new Error(
      `Failed to parse extension id from service worker url: ${workerText}`,
    )
  }

  const fullPageUrl = `chrome-extension://${extensionId}/popup.html?not_popup=1`
  await controlPage.goto(fullPageUrl, {
    waitUntil: 'domcontentloaded',
    timeout: NAVIGATION_TIMEOUT_MS,
  })
  await waitForUi(controlPage)

  return { context, controlPage, fullPageUrl, userDataDir }
}

async function openPopupPage(controlPage, fullPageUrl) {
  await controlPage.evaluate(
    async ({ url, width, height }) => {
      await chrome.windows.create({
        url,
        type: 'popup',
        focused: true,
        width,
        height,
      })
    },
    {
      url: fullPageUrl,
      width: VIEWPORT.width,
      height: VIEWPORT.height,
    },
  )

  let popupPage = null
  for (let attempt = 0; attempt < 60; attempt += 1) {
    popupPage =
      controlPage.context().pages().find(
        (candidate) =>
          candidate.url() === fullPageUrl && candidate !== controlPage,
      ) || null
    if (popupPage) {
      break
    }
    await sleep(100)
  }

  if (!popupPage) {
    throw new Error('Failed to locate popup page')
  }

  await popupPage.setViewportSize(VIEWPORT)
  await popupPage.bringToFront()
  await waitForUi(popupPage)
  return popupPage
}

function getPrimaryExpectedGroup(createdWindows) {
  for (const createdWindow of createdWindows) {
    for (const group of createdWindow.groups || []) {
      if (typeof group.groupId === 'number' && group.title) {
        return group
      }
    }
  }
  return null
}

async function waitForFreshGroupTitle(page, createdWindows) {
  const expectedGroup = getPrimaryExpectedGroup(createdWindows)
  if (!expectedGroup) {
    return
  }

  const locator = page.getByTestId(
    `tab-group-title-${expectedGroup.groupId}`,
  )
  const deadline = Date.now() + UI_READY_TIMEOUT_MS

  while (Date.now() < deadline) {
    const text = (await locator.textContent().catch(() => '')) || ''
    if (text.trim() === expectedGroup.title) {
      return
    }
    await page.waitForTimeout(100)
  }

  throw new Error(
    `Timed out waiting for fresh group title: ${expectedGroup.title}`,
  )
}

async function installDemoCursor(page) {
  await page.evaluate(() => {
    if (window.__demoCursorApi) {
      return
    }

    const style = document.createElement('style')
    style.textContent = `
      * { cursor: none !important; }
      #demo-cursor-root {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 2147483647;
      }
      #demo-cursor-dot {
        position: absolute;
        width: 18px;
        height: 18px;
        margin-left: -9px;
        margin-top: -9px;
        border-radius: 999px;
        background: #0ea5e9;
        border: 2px solid rgba(255, 255, 255, 0.95);
        box-shadow:
          0 8px 24px rgba(14, 165, 233, 0.32),
          0 2px 6px rgba(15, 23, 42, 0.22);
      }
      .demo-cursor-ring {
        position: absolute;
        width: 34px;
        height: 34px;
        margin-left: -17px;
        margin-top: -17px;
        border-radius: 999px;
        border: 2px solid rgba(14, 165, 233, 0.55);
        background: rgba(14, 165, 233, 0.08);
      }
      .demo-cursor-click {
        position: absolute;
        width: 28px;
        height: 28px;
        margin-left: -14px;
        margin-top: -14px;
        border-radius: 999px;
        border: 2px solid rgba(14, 165, 233, 0.85);
        opacity: 0;
        transform: scale(0.65);
      }
      .demo-cursor-click.active {
        animation: demo-cursor-pulse 480ms ease-out forwards;
      }
      @keyframes demo-cursor-pulse {
        0% {
          opacity: 0.95;
          transform: scale(0.65);
        }
        100% {
          opacity: 0;
          transform: scale(2.2);
        }
      }
    `
    document.head.appendChild(style)

    const root = document.createElement('div')
    root.id = 'demo-cursor-root'

    const ring = document.createElement('div')
    ring.className = 'demo-cursor-ring'

    const dot = document.createElement('div')
    dot.id = 'demo-cursor-dot'

    const click = document.createElement('div')
    click.className = 'demo-cursor-click'

    root.append(ring, click, dot)
    document.body.appendChild(root)

    let point = { x: -200, y: -200 }
    const paint = () => {
      ring.style.transform = `translate(${point.x}px, ${point.y}px)`
      dot.style.transform = `translate(${point.x}px, ${point.y}px)`
      click.style.transform = `translate(${point.x}px, ${point.y}px)`
    }

    paint()

    window.__demoCursorApi = {
      moveTo(x, y) {
        point = { x, y }
        paint()
      },
      click() {
        click.classList.remove('active')
        void click.offsetWidth
        click.classList.add('active')
      },
    }
  })
}

async function moveCursor(
  page,
  from,
  to,
  durationMs,
  steps = Math.max(10, Math.round(durationMs / 16)),
) {
  const pacedDurationMs = paceMove(durationMs)
  const pacedSteps = Math.max(10, Math.round(pacedDurationMs / 16))
  for (let index = 1; index <= pacedSteps; index += 1) {
    const progress = index / pacedSteps
    const eased = 1 - Math.pow(1 - progress, 2)
    const x = from.x + (to.x - from.x) * eased
    const y = from.y + (to.y - from.y) * eased

    await page.mouse.move(x, y)
    await page.evaluate(
      ({ nextX, nextY }) => {
        window.__demoCursorApi.moveTo(nextX, nextY)
      },
      { nextX: x, nextY: y },
    )
    await page.waitForTimeout(
      Math.max(8, Math.round(pacedDurationMs / pacedSteps)),
    )
  }
}

async function clickCurrent(page) {
  await page.mouse.down()
  await page.evaluate(() => {
    window.__demoCursorApi.click()
  })
  await page.waitForTimeout(pacePause(70))
  await page.mouse.up()
}

async function clickLocator(page, locator) {
  await page.evaluate(() => {
    window.__demoCursorApi.click()
  })
  await locator.click({ force: true })
  await page.waitForTimeout(pacePause(70))
}

async function wheelCursor(page, totalDeltaY, steps = 12) {
  await wheelCursorXY(page, 0, totalDeltaY, steps)
}

async function wheelCursorXY(page, totalDeltaX, totalDeltaY, steps = 12) {
  const stepCount = Math.max(6, steps)
  const stepDeltaX = totalDeltaX / stepCount
  const stepDeltaY = totalDeltaY / stepCount
  const stepDelayMs = Math.max(18, Math.round(pacePause(36) / 2))

  for (let index = 0; index < stepCount; index += 1) {
    await page.mouse.wheel(stepDeltaX, stepDeltaY)
    await page.waitForTimeout(stepDelayMs)
  }
}

async function waitForGroupTitle(page, groupId, expectedTitle) {
  await page.waitForFunction(
    ({ nextGroupId, nextTitle }) => {
      const node = document.querySelector(
        `[data-testid="tab-group-title-${nextGroupId}"]`,
      )
      return node?.textContent?.trim() === nextTitle
    },
    { timeout: UI_READY_TIMEOUT_MS },
    { nextGroupId: groupId, nextTitle: expectedTitle },
  )
}

async function waitForFloatingUiToClear(page) {
  await page.waitForFunction(
    () => {
      const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) {
          return false
        }

        const style = window.getComputedStyle(element)
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number(style.opacity || '1') === 0
        ) {
          return false
        }

        const rect = element.getBoundingClientRect()
        return rect.width > 1 && rect.height > 1
      }

      return [
        ...document.querySelectorAll('.MuiPopover-root, .MuiAutocomplete-popper'),
      ].every((element) => !isVisible(element))
    },
    { timeout: UI_READY_TIMEOUT_MS },
  )
}

async function getCenter(locator) {
  const box = await locator.boundingBox()
  if (!box) {
    throw new Error('Failed to read element bounds')
  }
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  }
}

async function startScreencast(page, clipName) {
  const clipWorkDir = join(WORK_DIR, clipName)
  rmSync(clipWorkDir, { recursive: true, force: true })
  mkdirSync(clipWorkDir, { recursive: true })

  const client = await page.context().newCDPSession(page)
  let frameIndex = 0

  const onFrame = async ({ data, sessionId }) => {
    frameIndex += 1
    const framePath = join(
      clipWorkDir,
      `frame-${String(frameIndex).padStart(5, '0')}.jpg`,
    )
    writeFileSync(framePath, Buffer.from(data, 'base64'))
    await client.send('Page.screencastFrameAck', { sessionId })
  }

  client.on('Page.screencastFrame', onFrame)
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    everyNthFrame: 1,
  })

  return {
    async stop() {
      await page.waitForTimeout(200)
      await client.send('Page.stopScreencast')
      await page.waitForTimeout(350)
      client.off('Page.screencastFrame', onFrame)
      return {
        clipWorkDir,
        frameCount: frameIndex,
      }
    },
  }
}

function encodeClip(clipName, clipWorkDir) {
  mkdirSync(MP4_DIR, { recursive: true })

  const outputPath = join(MP4_DIR, `${clipName}.mp4`)
  rmSync(outputPath, { force: true })

  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-framerate',
      String(CAPTURE_FPS),
      '-i',
      join(clipWorkDir, 'frame-%05d.jpg'),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputPath,
    ],
    { stdio: 'inherit' },
  )

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${clipName}`)
  }

  rmSync(clipWorkDir, { recursive: true, force: true })
  return outputPath
}

async function withScenario(
  clipName,
  windows,
  settings,
  runClip,
  options = {},
) {
  const { context, controlPage, fullPageUrl, userDataDir } =
    await initControlContext()

  try {
    await resetScenario(controlPage, fullPageUrl, settings)
    const createdWindows = await createDemoWindows(
      controlPage,
      windows,
      options.waitOptions,
    )
    await waitForScenarioReady(controlPage, scenarioCounts(windows))

    const popupPage = await openPopupPage(controlPage, fullPageUrl)
    await reloadPopup(popupPage)
    await waitForFreshGroupTitle(popupPage, createdWindows)
    await controlPage.close()

    await installDemoCursor(popupPage)
    const startPoint = { x: 84, y: 744 }
    await popupPage.evaluate(
      ({ x, y }) => {
        window.__demoCursorApi.moveTo(x, y)
      },
      startPoint,
    )
    await popupPage.mouse.move(startPoint.x, startPoint.y)
    await demoPause(popupPage, 200)

    const screencast = await startScreencast(popupPage, clipName)
    await runClip(popupPage, startPoint, createdWindows)
    const { clipWorkDir } = await screencast.stop()

    await popupPage.close()
    await context.close()

    const outputPath = encodeClip(clipName, clipWorkDir)
    console.log(`saved ${outputPath}`)
    return outputPath
  } finally {
    rmSync(userDataDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 250,
    })
  }
}

async function recordFindTabFast() {
  const clipName = '01-find-tab-fast'
  const windows = [
    {
      tabs: [
        realUrl('brand/jenny-home'),
        realUrl('brand/jenny-short'),
        realUrl('brand/jenny-youtube'),
        realUrl('research/tab-groups-api'),
        realUrl('launch/support-plan'),
        realUrl('launch/rollout-plan'),
      ],
      groups: [
        {
          title: 'Jenny Media',
          color: 'blue',
          collapsed: true,
          urls: [
            realUrl('brand/jenny-home'),
            realUrl('brand/jenny-short'),
            realUrl('brand/jenny-youtube'),
          ],
        },
      ],
    },
  ]

  return withScenario(
    clipName,
    windows,
    { useSystemTheme: false, darkTheme: false },
    async (page, startPoint) => {
      await demoHold(page, 900)
      const searchInput = page.locator(
        'input[placeholder*="Search tabs or URLs"]',
      )
      const inputCenter = await getCenter(searchInput)
      await moveCursor(page, startPoint, inputCenter, 850)
      await demoPause(page, 180)
      await clickCurrent(page)
      await demoPause(page, 220)
      await searchInput.type('jenny', { delay: paceType(170) })
      await demoHold(page, 2600)
    },
  )
}

async function recordOrganizeGroups() {
  const clipName = '02-organize-groups'
  const windows = [
    {
      tabs: [
        realUrl('brand/jenny-home'),
        realUrl('brand/jenny-short'),
        realUrl('brand/jenny-youtube'),
        realUrl('launch/support-plan'),
        realUrl('launch/rollout-plan'),
        realUrl('research/tab-groups-api'),
      ],
      groups: [
        {
          title: 'Jenny Media',
          color: 'green',
          urls: [
            realUrl('brand/jenny-home'),
            realUrl('brand/jenny-short'),
            realUrl('brand/jenny-youtube'),
          ],
        },
      ],
    },
  ]

  return withScenario(
    clipName,
    windows,
    { useSystemTheme: false, darkTheme: false },
    async (page, startPoint, createdWindows) => {
      const groupId = createdWindows[0].groups[0].groupId
      await demoHold(page, 700)

      const header = page.getByTestId(`tab-group-header-${groupId}`)
      const headerCenter = await getCenter(header)
      await moveCursor(page, startPoint, headerCenter, 800)
      await demoPause(page, 220)

      const menu = page.getByTestId(`tab-group-menu-${groupId}`)
      await menu.waitFor({ state: 'visible', timeout: 10000 })
      const menuCenter = await getCenter(menu)
      await moveCursor(page, headerCenter, menuCenter, 350)
      await demoPause(page, 150)
      await clickCurrent(page)
      await demoPause(page, 280)

      const renameOption = page.getByTestId(`tab-group-menu-rename-${groupId}`)
      const optionCenter = await getCenter(renameOption)
      await moveCursor(page, menuCenter, optionCenter, 420)
      await demoPause(page, 120)
      await clickCurrent(page)

      const titleInput = page.getByTestId(`tab-group-editor-title-${groupId}`)
      await titleInput.waitFor({ state: 'visible', timeout: 10000 })
      await demoPause(page, 260)
      await titleInput.type('AI Workspace', { delay: paceType(135) })
      await demoPause(page, 150)
      await page.keyboard.press('Enter')
      await demoHold(page, 1800)
    },
  )
}

async function recordCleanUpDuplicates() {
  const clipName = '03-clean-up-duplicates'
  const windows = [
    {
      tabs: [
        realUrl('launch/final-checklist'),
        realUrl('launch/final-checklist'),
        realUrl('launch/support-plan'),
        realUrl('launch/support-plan'),
        realUrl('brand/jenny-youtube'),
        realUrl('brand/jenny-youtube'),
        realUrl('support/release-mail'),
        realUrl('research/firefox-parity'),
        realUrl('research/firefox-parity'),
        realUrl('support/docs-ticket'),
      ],
      groups: [
        {
          title: 'Operations',
          color: 'orange',
          urls: [
            realUrl('launch/final-checklist'),
            realUrl('launch/support-plan'),
            realUrl('brand/jenny-youtube'),
            realUrl('support/release-mail'),
          ],
        },
      ],
    },
    {
      tabs: [
        realUrl('brand/jenny-home'),
        realUrl('brand/jenny-home'),
        realUrl('brand/jenny-short'),
        realUrl('brand/jenny-short'),
        realUrl('support/customer-4821'),
        realUrl('support/customer-5104'),
      ],
      groups: [
        {
          title: 'Cleanup Queue',
          color: 'green',
          urls: [
            realUrl('brand/jenny-home'),
            realUrl('brand/jenny-short'),
            realUrl('support/customer-4821'),
          ],
        },
      ],
    },
  ]

  return withScenario(
    clipName,
    windows,
    {
      useSystemTheme: false,
      darkTheme: false,
      highlightDuplicatedTab: true,
      ignoreHash: false,
    },
    async (page, startPoint) => {
      await demoHold(page, 1100)
      const cleanButton = page
        .locator('button[aria-label^="Clean "][aria-label*="duplicate"]')
        .first()
      await cleanButton.waitFor({ state: 'visible', timeout: 15000 })
      const buttonCenter = await getCenter(cleanButton)
      await moveCursor(page, startPoint, buttonCenter, 950)
      await demoPause(page, 220)
      await clickCurrent(page)
      await demoHold(page, 2400)
    },
  )
}

async function recordLargeWorkspaces() {
  const clipName = '04-see-large-workspaces-clearly'
  const windows = [
    {
      tabs: [
        realUrl('launch/release-roadmap'),
        realUrl('launch/store-copy'),
        realUrl('launch/qa-signoff'),
        realUrl('launch/rollout-plan'),
        realUrl('launch/support-plan'),
        realUrl('research/keyboard-flows'),
        realUrl('research/ux-followups'),
        realUrl('reading/accessibility-audit'),
        realUrl('reading/changelog-draft'),
      ],
      groups: [
        {
          title: 'Launch',
          color: 'blue',
          urls: [
            realUrl('launch/release-roadmap'),
            realUrl('launch/store-copy'),
            realUrl('launch/qa-signoff'),
          ],
        },
        {
          title: 'Planning',
          color: 'orange',
          collapsed: true,
          urls: [
            realUrl('launch/rollout-plan'),
            realUrl('launch/support-plan'),
            realUrl('research/keyboard-flows'),
          ],
        },
        {
          title: 'Reading',
          color: 'green',
          collapsed: true,
          urls: [
            realUrl('research/ux-followups'),
            realUrl('reading/accessibility-audit'),
            realUrl('reading/changelog-draft'),
          ],
        },
      ],
    },
    {
      tabs: [
        realUrl('brand/jenny-home'),
        realUrl('brand/jenny-short'),
        realUrl('brand/jenny-youtube'),
        realUrl('research/tab-groups-api'),
        realUrl('research/firefox-parity'),
        realUrl('research/edge-review'),
        realUrl('support/customer-4821'),
        realUrl('support/customer-5104'),
        realUrl('support/release-mail'),
        realUrl('support/docs-ticket'),
        realUrl('launch/final-checklist'),
      ],
      groups: [
        {
          title: 'Brand',
          color: 'green',
          urls: [
            realUrl('brand/jenny-home'),
            realUrl('brand/jenny-short'),
            realUrl('brand/jenny-youtube'),
          ],
        },
        {
          title: 'Docs',
          color: 'blue',
          collapsed: true,
          urls: [
            realUrl('research/tab-groups-api'),
            realUrl('research/firefox-parity'),
            realUrl('research/edge-review'),
          ],
        },
        {
          title: 'Support',
          color: 'red',
          collapsed: true,
          urls: [
            realUrl('support/customer-4821'),
            realUrl('support/customer-5104'),
            realUrl('support/release-mail'),
            realUrl('support/docs-ticket'),
          ],
        },
      ],
    },
  ]

  return withScenario(
    clipName,
    windows,
    { useSystemTheme: false, darkTheme: false, tabWidth: 22 },
    async (page, startPoint, createdWindows) => {
      const planningGroupId = createdWindows[0].groups[1].groupId
      await demoHold(page, 950)

      const planningToggle = page.getByTestId(
        `tab-group-toggle-${planningGroupId}`,
      )
      const toggleCenter = await getCenter(planningToggle)
      await moveCursor(page, startPoint, toggleCenter, 900)
      await demoPause(page, 180)
      await clickCurrent(page)
      await demoHold(page, 2200)
    },
  )
}

async function recordKeyboardWorkflow() {
  const clipName = '05-keyboard-workflow'
  const windows = [
    {
      tabs: [
        realUrl('launch/release-roadmap'),
        realUrl('launch/store-copy'),
        realUrl('launch/final-checklist'),
        realUrl('launch/rollout-plan'),
      ],
      groups: [
        {
          title: 'AI Tools',
          color: 'blue',
          urls: [
            realUrl('launch/release-roadmap'),
            realUrl('launch/store-copy'),
          ],
        },
      ],
    },
  ]

  return withScenario(
    clipName,
    windows,
    { useSystemTheme: false, darkTheme: false },
    async (page, startPoint) => {
      await demoHold(page, 850)

      const helpButton = page
        .locator('button[aria-label="Show shortcut hints"]')
        .first()
      const helpCenter = await getCenter(helpButton)
      await moveCursor(page, startPoint, helpCenter, 850)
      await demoPause(page, 180)
      await clickCurrent(page)

      const searchBox = page.getByRole('searchbox', { name: 'Search' })
      await searchBox.waitFor({ state: 'visible', timeout: 15000 })
      await demoPause(page, 350)
      const searchCenter = await getCenter(searchBox)
      await moveCursor(page, helpCenter, searchCenter, 700)
      await demoPause(page, 120)
      await clickCurrent(page)
      await demoPause(page, 180)
      await searchBox.type('group', { delay: paceType(150) })
      await demoHold(page, 1900)
    },
  )
}

async function recordCustomizeView() {
  const clipName = '06-customize-the-view'
  const windows = [
    {
      tabs: [
        realUrl('launch/release-roadmap'),
        realUrl('research/tab-groups-api'),
        realUrl('reading/design-refresh'),
        realUrl('launch/support-plan'),
        realUrl('brand/jenny-home'),
      ],
      groups: [
        {
          title: 'Workspace',
          color: 'blue',
          urls: [
            realUrl('launch/release-roadmap'),
            realUrl('research/tab-groups-api'),
            realUrl('reading/design-refresh'),
          ],
        },
      ],
    },
  ]

  return withScenario(
    clipName,
    windows,
    { useSystemTheme: false, darkTheme: false },
    async (page, startPoint) => {
      await demoHold(page, 850)

      const settingsButton = page
        .locator('button[aria-label="Settings"]')
        .first()
      const settingsCenter = await getCenter(settingsButton)
      await moveCursor(page, startPoint, settingsCenter, 850)
      await demoPause(page, 180)
      await clickCurrent(page)

      const panel = page.getByTestId('settings-panel-theme-density')
      await panel.waitFor({ state: 'visible', timeout: 15000 })
      await demoPause(page, 450)

      const darkThemeButton = panel.getByRole('button', {
        name: 'Use dark theme',
      })
      const darkCenter = await getCenter(darkThemeButton)
      await moveCursor(page, settingsCenter, darkCenter, 700)
      await demoPause(page, 120)
      await clickCurrent(page)
      await demoHold(page, 700)

      const fontIncrease = page.locator('[aria-label="Increase Font Size"]').first()
      const fontCenter = await getCenter(fontIncrease)
      await moveCursor(page, darkCenter, fontCenter, 700)
      await demoPause(page, 120)
      await clickCurrent(page)
      await demoHold(page, 1800)
    },
  )
}

async function recordHundredPlusTabsScale() {
  const clipName = '07-hundred-plus-tabs-scale'
  const windows = [
    {
      tabs: buildRepeatedRealUrls(SCALE_DEMO_URL_KEYS, 8),
      groups: [],
    },
  ]

  return withScenario(
    clipName,
    windows,
    {
      useSystemTheme: false,
      darkTheme: false,
      tabWidth: 18,
      fontSize: 13,
    },
    async (page, startPoint, createdWindows) => {
      const windowId = createdWindows[0].windowId
      const cleanedScenarioCounts = {
        windowCount: createdWindows.length + 1,
        tabCount: SCALE_DEMO_URL_KEYS.length + 1,
      }
      await demoHold(page, 900)

      const windowTitle = page.getByTestId(`window-title-${windowId}`)
      const titleCenter = await getCenter(windowTitle)
      await moveCursor(page, startPoint, titleCenter, 820)
      await demoPause(page, 180)

      const sortButton = page.locator('button[aria-label="Sort tabs"]').first()
      await sortButton.waitFor({ state: 'visible', timeout: 15000 })
      const sortCenter = await getCenter(sortButton)
      await moveCursor(page, titleCenter, sortCenter, 430)
      await demoPause(page, 120)
      await clickLocator(page, sortButton)
      await demoHold(page, 1050)

      const scrollContainer = page.getByTestId('window-list-scroll-container')
      const scrollBox = await scrollContainer.boundingBox()
      if (!scrollBox) {
        throw new Error('Failed to read scroll container bounds')
      }
      const scrollPoint = {
        x: scrollBox.x + scrollBox.width * 0.6,
        y: scrollBox.y + scrollBox.height * 0.6,
      }
      await moveCursor(page, sortCenter, scrollPoint, 760)
      await demoPause(page, 120)
      await wheelCursor(page, 2200, 18)
      await demoPause(page, 140)
      await wheelCursor(page, 1800, 16)
      await demoHold(page, 900)

      const cleanButton = page
        .locator('button[aria-label^="Clean "][aria-label*="duplicate"]')
        .first()
      await cleanButton.waitFor({ state: 'visible', timeout: 15000 })
      const cleanCenter = await getCenter(cleanButton)
      await moveCursor(page, scrollPoint, cleanCenter, 860)
      await demoPause(page, 140)
      await clickLocator(page, cleanButton)
      await waitForScenarioReady(page, cleanedScenarioCounts)

      const finalPoint = {
        x: scrollBox.x + scrollBox.width * 0.54,
        y: scrollBox.y + scrollBox.height * 0.36,
      }
      await moveCursor(page, cleanCenter, finalPoint, 620)
      await demoHold(page, 1300)
    },
  )
}

async function recordThousandTwentyFourTabsScale() {
  const clipName = '08-thousand-twenty-four-tabs-scale'
  // This scale clip intentionally swaps real sites for local synthetic fixtures
  // so the 1,024-tab scenario stays deterministic, fast, and safe to capture.
  const fixtureServer = await startLocalFixtureServer()

  try {
    const windows = buildThousandTwentyFourScaleWindows((key) =>
      buildLocalFixtureUrl(fixtureServer.baseUrl, key),
    )

    return await withScenario(
      clipName,
      windows,
      {
        useSystemTheme: false,
        darkTheme: false,
        tabWidth: 16,
        fontSize: 13,
      },
      async (page, startPoint, createdWindows) => {
        const heroWindowId = createdWindows[0].windowId
        const renamedHeroGroupId = createdWindows[0].groups[1].groupId
        const sideGroupId = createdWindows[1].groups[0].groupId
        const closedWindowId = createdWindows[2].windowId
        const finalScenarioCounts = {
          windowCount: createdWindows.length,
          tabCount: 1024 - 10 - windows[2].tabs.length + 1,
        }
        await demoHold(page, 1000)

        const heroWindowTitle = page.getByTestId(`window-title-${heroWindowId}`)
        const titleCenter = await getCenter(heroWindowTitle)
        await moveCursor(page, startPoint, titleCenter, 900)
        await demoPause(page, 180)

        const scrollContainer = page.getByTestId('window-list-scroll-container')
        const scrollBox = await scrollContainer.boundingBox()
        if (!scrollBox) {
          throw new Error('Failed to read scroll container bounds')
        }
        const scrollPoint = {
          x: scrollBox.x + scrollBox.width * 0.28,
          y: scrollBox.y + scrollBox.height * 0.48,
        }
        await moveCursor(page, titleCenter, scrollPoint, 620)
        await demoPause(page, 120)
        await wheelCursor(page, 5600, 36)
        await demoPause(page, 140)
        await wheelCursor(page, -5600, 36)
        await demoPause(page, 140)
        await wheelCursorXY(page, 2600, 0, 24)
        await demoPause(page, 140)
        await wheelCursorXY(page, -2600, 0, 24)
        await demoHold(page, 700)

        const heroGroupHeader = page.getByTestId(
          `tab-group-header-${renamedHeroGroupId}`,
        )
        const heroGroupHeaderCenter = await getCenter(heroGroupHeader)
        await moveCursor(page, scrollPoint, heroGroupHeaderCenter, 540)
        await demoPause(page, 100)
        await heroGroupHeader.focus()
        const heroGroupMenu = page.getByTestId(
          `tab-group-menu-${renamedHeroGroupId}`,
        )
        await heroGroupMenu.waitFor({ state: 'visible', timeout: 15000 })
        const heroGroupMenuCenter = await getCenter(heroGroupMenu)
        await moveCursor(page, heroGroupHeaderCenter, heroGroupMenuCenter, 500)
        await demoPause(page, 140)
        await clickLocator(page, heroGroupMenu)

        const renameItem = page.getByTestId(
          `tab-group-menu-rename-${renamedHeroGroupId}`,
        )
        await renameItem.waitFor({ state: 'visible', timeout: 15000 })
        const renameCenter = await getCenter(renameItem)
        await moveCursor(page, heroGroupMenuCenter, renameCenter, 360)
        await demoPause(page, 120)
        await clickLocator(page, renameItem)

        const editor = page.getByTestId(`tab-group-editor-${renamedHeroGroupId}`)
        await editor.waitFor({ state: 'visible', timeout: 15000 })
        const titleInput = page.getByTestId(
          `tab-group-editor-title-${renamedHeroGroupId}`,
        )
        const titleInputCenter = await getCenter(titleInput)
        await moveCursor(page, renameCenter, titleInputCenter, 460)
        await demoPause(page, 120)
        await clickLocator(page, titleInput)
        await titleInput.fill('Launch Ops')
        await demoPause(page, 120)

        const redColor = page.getByTestId(
          `tab-group-editor-color-${renamedHeroGroupId}-red`,
        )
        const redColorCenter = await getCenter(redColor)
        await moveCursor(page, titleInputCenter, redColorCenter, 360)
        await demoPause(page, 120)
        await clickLocator(page, redColor)
        await page.keyboard.press('Escape')
        await editor.waitFor({ state: 'hidden', timeout: 15000 })
        await waitForFloatingUiToClear(page)
        await waitForGroupTitle(page, renamedHeroGroupId, 'Launch Ops')
        await demoHold(page, 600)

        const renamedHeroToggle = page.getByTestId(
          `tab-group-toggle-${renamedHeroGroupId}`,
        )
        const renamedHeroToggleCenter = await getCenter(renamedHeroToggle)
        await moveCursor(page, redColorCenter, renamedHeroToggleCenter, 520)
        await demoPause(page, 120)
        await clickLocator(page, renamedHeroToggle)
        await demoHold(page, 700)

        const syncPoint = {
          x: scrollBox.x + scrollBox.width * 0.12,
          y: scrollBox.y + 24,
        }
        await moveCursor(page, renamedHeroToggleCenter, syncPoint, 620)
        await demoPause(page, 120)
        await page.evaluate(() => {
          const activeElement = document.activeElement
          if (activeElement instanceof HTMLElement) {
            activeElement.blur()
          }
        })
        await page.keyboard.press('s')
        await demoHold(page, 900)

        const sideGroupHeader = page.getByTestId(`tab-group-header-${sideGroupId}`)
        const sideGroupHeaderCenter = await getCenter(sideGroupHeader)
        await moveCursor(page, syncPoint, sideGroupHeaderCenter, 760)
        await demoPause(page, 100)
        await sideGroupHeader.focus()
        const sideGroupClose = sideGroupHeader.locator(
          'button[aria-label="Close group"]',
        )
        await sideGroupClose.waitFor({ state: 'visible', timeout: 15000 })
        const sideGroupCloseCenter = await getCenter(sideGroupClose)
        await moveCursor(page, sideGroupHeaderCenter, sideGroupCloseCenter, 340)
        await demoPause(page, 140)
        await clickLocator(page, sideGroupClose)
        await sideGroupHeader.waitFor({ state: 'hidden', timeout: 15000 })
        await demoHold(page, 700)

        const closingWindowTitle = page.getByTestId(`window-title-${closedWindowId}`)
        const closingWindowTitleCenter = await getCenter(closingWindowTitle)
        await moveCursor(page, sideGroupCloseCenter, closingWindowTitleCenter, 720)
        await demoPause(page, 100)
        await closingWindowTitle.focus()
        const closingWindowButton = closingWindowTitle.locator(
          'button[aria-label="Close"]',
        )
        await closingWindowButton.waitFor({ state: 'visible', timeout: 15000 })
        const closingWindowCenter = await getCenter(closingWindowButton)
        await moveCursor(
          page,
          closingWindowTitleCenter,
          closingWindowCenter,
          320,
        )
        await demoPause(page, 140)
        await clickLocator(page, closingWindowButton)
        await waitForScenarioReady(page, finalScenarioCounts)

        const finalPoint = {
          x: scrollBox.x + scrollBox.width * 0.33,
          y: scrollBox.y + scrollBox.height * 0.32,
        }
        await moveCursor(page, closingWindowCenter, finalPoint, 660)
        await demoHold(page, 1500)
      },
      {
        waitOptions: {
          batchSize: 24,
          batchPauseMs: 250,
          stablePolls: 3,
          postLoadSettleMs: 900,
        },
      },
    )
  } finally {
    await fixtureServer.close()
  }
}

const CLIPS = [
  { id: '01-find-tab-fast', capture: recordFindTabFast },
  { id: '02-organize-groups', capture: recordOrganizeGroups },
  { id: '03-clean-up-duplicates', capture: recordCleanUpDuplicates },
  { id: '04-see-large-workspaces-clearly', capture: recordLargeWorkspaces },
  { id: '05-keyboard-workflow', capture: recordKeyboardWorkflow },
  { id: '06-customize-the-view', capture: recordCustomizeView },
  { id: '07-hundred-plus-tabs-scale', capture: recordHundredPlusTabsScale },
  { id: '08-thousand-twenty-four-tabs-scale', capture: recordThousandTwentyFourTabsScale },
]

async function main() {
  if (!existsSync(EXTENSION_PATH)) {
    throw new Error(`Missing extension build at ${EXTENSION_PATH}`)
  }

  mkdirSync(WORK_DIR, { recursive: true })

  const outputs = []
  for (const clip of CLIPS) {
    if (!shouldCaptureClip(clip.id)) {
      continue
    }
    outputs.push(await clip.capture())
  }

  console.log('done')
  for (const output of outputs) {
    console.log(output)
  }
}

await main()
