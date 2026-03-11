#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const VIEWPORT = { width: 1280, height: 800 }
const UI_READY_TIMEOUT_MS = 120000
const UI_SETTLE_DELAY_MS = 700
const NAVIGATION_TIMEOUT_MS = 120000
const TAB_LOAD_TIMEOUT_MS = 90000
const TAB_LOAD_POLL_INTERVAL_MS = 250
const TAB_LOAD_STABLE_POLLS = 4
const TAB_POST_LOAD_SETTLE_DELAY_MS = 1800
const SCREENSHOT_SETTLE_DELAY_MS = 600
const SCROLLBAR_FADE_DELAY_MS = 2400
const TAB_CREATE_BATCH_SIZE = 6
const TAB_CREATE_BATCH_DELAY_MS = 2500
const DENSE_OVERVIEW_FOCUS_WINDOW_INDEX = 5
const DENSE_OVERVIEW_FOCUS_TAB_INDEX = 1
const INTERSTITIAL_TITLE_SNIPPETS = [
  'just a moment',
  'are you a robot',
  'attention required',
  'checking your browser',
  'please wait',
]
const ROOT_DIR = join(fileURLToPath(new URL('../../..', import.meta.url)))
const OUTPUT_ROOT_DIR = join(ROOT_DIR, 'docs/assets/images/release-candidates')
const PNG_OUTPUT_DIR = join(OUTPUT_ROOT_DIR, 'png')
const EXTENSION_PATH = join(ROOT_DIR, 'packages/extension/build/build_chrome')
const REQUESTED_THEMES = String(
  process.env.RELEASE_SCREENSHOT_THEMES || '',
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const REQUESTED_SCENARIOS = new Set(
  String(process.env.RELEASE_SCREENSHOT_SCENARIOS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)

const THEME_VARIANTS = [
  {
    name: 'light',
    settings: {
      useSystemTheme: false,
      darkTheme: false,
    },
  },
  {
    name: 'dark',
    settings: {
      useSystemTheme: false,
      darkTheme: true,
    },
  },
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

// Avoid URLs that frequently trigger bot checks during automation captures.
const REAL_URLS = {
  'brand/jenny-home': 'https://jenny.media/',
  'brand/jenny-short': 'https://s.jenny.media/',
  'brand/jenny-youtube': 'https://www.youtube.com/@JennyTV1',
  'launch/release-roadmap': 'https://developer.chrome.com/',
  'launch/store-copy': 'https://developer.mozilla.org/',
  'launch/final-checklist': 'https://github.com/',
  'launch/support-plan': 'https://vercel.com/',
  'launch/qa-signoff': 'https://react.dev/',
  'launch/rollout-plan': 'https://nodejs.org/',
  'research/tab-groups-api':
    'https://developer.chrome.com/docs/extensions/',
  'research/firefox-parity':
    'https://extensionworkshop.com/',
  'research/edge-review':
    'https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/',
  'research/keyboard-flows': 'https://playwright.dev/',
  'research/ux-followups': 'https://vite.dev/',
  'research/screenshot-brief': 'https://news.ycombinator.com/',
  'reading/design-refresh': 'https://www.smashingmagazine.com/',
  'reading/accessibility-audit': 'https://web.dev/',
  'reading/performance-review': 'https://pagespeed.web.dev/',
  'reading/changelog-draft': 'https://css-tricks.com/',
  'support/customer-4821': 'https://www.reuters.com/',
  'support/customer-5104': 'https://apnews.com/',
  'support/release-mail': 'https://www.reddit.com/r/chrome_extensions/',
  'support/docs-ticket':
    'https://developer.chrome.com/docs/extensions/get-started/',
  'ops/duplicate-tabs': 'https://jenny.media/',
  'ops/window-groups': 'https://s.jenny.media/',
}

function buildWindowsFromGroupLayout(groups, layout) {
  const windows = []
  let index = 0
  for (const groupCount of layout) {
    const windowGroups = groups.slice(index, index + groupCount)
    if (windowGroups.length !== groupCount) {
      throw new Error(
        `Group layout overflow: expected ${groupCount} groups at index ${index}`,
      )
    }
    windows.push({
      tabs: windowGroups.flatMap((group) => group.urls),
      groups: windowGroups,
    })
    index += groupCount
  }
  if (index !== groups.length) {
    throw new Error(`Group layout mismatch: used ${index} of ${groups.length}`)
  }
  return windows
}

const DENSE_OVERVIEW_GROUPS = [
  {
    title: 'AI Workspace',
    color: 'blue',
    urls: [
      'https://openai.com/chatgpt/',
      'https://www.anthropic.com/claude',
      'https://gemini.google.com/',
      'https://ai.google.dev/',
    ],
  },
  {
    title: 'Productivity',
    color: 'green',
    urls: [
      'https://www.notion.so/',
      'https://linear.app/',
      'https://www.figma.com/',
      'https://slack.com/',
    ],
  },
  {
    title: 'Planning',
    color: 'orange',
    collapsed: true,
    urls: [
      'https://zoom.us/',
      'https://calendly.com/',
      'https://airtable.com/',
      'https://www.canva.com/',
    ],
  },
  {
    title: 'Collaboration',
    color: 'blue',
    collapsed: true,
    urls: [
      'https://github.com/',
      'https://gitlab.com/',
      'https://bitbucket.org/',
      'https://about.gitlab.com/',
    ],
  },
  {
    title: 'Platforms',
    color: 'green',
    collapsed: true,
    urls: [
      'https://vercel.com/',
      'https://www.netlify.com/',
      'https://supabase.com/',
      'https://firebase.google.com/',
    ],
  },
  {
    title: 'Tooling',
    color: 'yellow',
    collapsed: true,
    urls: [
      'https://www.postman.com/',
      'https://www.docker.com/',
      'https://kubernetes.io/',
      'https://www.typescriptlang.org/',
    ],
  },
  {
    title: 'Frontend',
    color: 'blue',
    collapsed: true,
    urls: [
      'https://react.dev/',
      'https://vuejs.org/',
      'https://svelte.dev/',
      'https://nextjs.org/',
    ],
  },
  {
    title: 'Web Docs',
    color: 'green',
    urls: [
      'https://jenny.media/',
      'https://s.jenny.media/',
      'https://developer.mozilla.org/',
      'https://developer.chrome.com/',
    ],
  },
  {
    title: 'Languages',
    color: 'red',
    urls: [
      'https://go.dev/',
      'https://www.python.org/',
      'https://www.rust-lang.org/',
      'https://www.postgresql.org/',
    ],
  },
  {
    title: 'Cloud',
    color: 'blue',
    collapsed: true,
    urls: [
      'https://aws.amazon.com/',
      'https://azure.microsoft.com/',
      'https://cloud.google.com/',
      'https://www.cloudflare.com/',
    ],
  },
  {
    title: 'Hosting',
    color: 'green',
    collapsed: true,
    urls: [
      'https://render.com/',
      'https://railway.com/',
      'https://fly.io/',
      'https://www.digitalocean.com/',
    ],
  },
  {
    title: 'Backend',
    color: 'orange',
    collapsed: true,
    urls: [
      'https://www.heroku.com/',
      'https://www.mongodb.com/',
      'https://redis.io/',
      'https://stripe.com/',
    ],
  },
  {
    title: 'Visuals',
    color: 'blue',
    collapsed: true,
    urls: [
      'https://miro.com/',
      'https://www.grammarly.com/',
      'https://trello.com/',
      'https://asana.com/',
    ],
  },
  {
    title: 'Workflows',
    color: 'green',
    collapsed: true,
    urls: [
      'https://monday.com/',
      'https://clickup.com/',
      'https://todoist.com/',
      'https://readwise.io/',
    ],
  },
  {
    title: 'Assets',
    color: 'orange',
    collapsed: true,
    urls: [
      'https://www.loom.com/',
      'https://www.dropbox.com/',
      'https://www.box.com/',
      'https://zapier.com/',
    ],
  },
  {
    title: 'Communities',
    color: 'blue',
    collapsed: true,
    urls: [
      'https://news.ycombinator.com/',
      'https://www.reddit.com/',
      'https://dev.to/',
      'https://medium.com/',
    ],
  },
  {
    title: 'Creators',
    color: 'green',
    collapsed: true,
    urls: [
      'https://substack.com/',
      'https://www.producthunt.com/',
      'https://lobste.rs/',
      'https://www.youtube.com/',
    ],
  },
  {
    title: 'Social',
    color: 'purple',
    collapsed: true,
    urls: [
      'https://www.wikipedia.org/',
      'https://www.linkedin.com/',
      'https://discord.com/',
      'https://www.twitch.tv/',
    ],
  },
  {
    title: 'Newsroom',
    color: 'blue',
    collapsed: true,
    urls: [
      'https://www.reuters.com/',
      'https://www.bbc.com/',
      'https://www.theguardian.com/international',
      'https://apnews.com/',
    ],
  },
  {
    title: 'Tech News',
    color: 'green',
    collapsed: true,
    urls: [
      'https://www.theverge.com/',
      'https://arstechnica.com/',
      'https://techcrunch.com/',
      'https://www.engadget.com/',
    ],
  },
  {
    title: 'Briefing',
    color: 'red',
    collapsed: true,
    urls: [
      'https://www.smashingmagazine.com/',
      'https://css-tricks.com/',
      'https://web.dev/',
      'https://blog.mozilla.org/',
    ],
  },
  {
    title: 'Models',
    color: 'blue',
    collapsed: true,
    urls: [
      'https://openrouter.ai/',
      'https://huggingface.co/',
      'https://replicate.com/',
      'https://cohere.com/',
    ],
  },
  {
    title: 'AI Labs',
    color: 'green',
    collapsed: true,
    urls: [
      'https://mistral.ai/',
      'https://stability.ai/',
      'https://deepmind.google/',
      'https://www.langchain.com/',
    ],
  },
  {
    title: 'Observability',
    color: 'orange',
    collapsed: true,
    urls: [
      'https://www.datadoghq.com/',
      'https://sentry.io/',
      'https://grafana.com/',
      'https://prometheus.io/',
    ],
  },
  {
    title: 'Styling',
    color: 'blue',
    collapsed: true,
    urls: [
      'https://tailwindcss.com/',
      'https://vite.dev/',
      'https://pnpm.io/',
      'https://bun.sh/',
    ],
  },
  {
    title: 'Runtime',
    color: 'green',
    collapsed: true,
    urls: [
      'https://deno.com/',
      'https://eslint.org/',
      'https://prettier.io/',
      'https://vitest.dev/',
    ],
  },
  {
    title: 'Testing',
    color: 'yellow',
    urls: [
      'https://www.youtube.com/@JennyTV1',
      'https://playwright.dev/',
      'https://jestjs.io/',
      'https://storybook.js.org/',
    ],
  },
]

const DENSE_OVERVIEW_GROUP_LAYOUT = [2, 5, 2, 8, 3, 3, 2, 1, 1]
const DENSE_OVERVIEW_WINDOWS = buildWindowsFromGroupLayout(
  DENSE_OVERVIEW_GROUPS,
  DENSE_OVERVIEW_GROUP_LAYOUT,
)

function realUrl(key) {
  const url = REAL_URLS[key]
  if (!url) {
    throw new Error(`Missing real url mapping for ${key}`)
  }
  return url
}

function resolveWindows(definitions) {
  return definitions.map((definition) => ({
    tabs: definition.tabs.map(realUrl),
    groups: (definition.groups || []).map((group) => ({
      ...group,
      urls: group.urls.map(realUrl),
    })),
  }))
}

function screenshotName(baseName, themeName) {
  return `${baseName}-${themeName}`
}

function scenarioCounts(definitions) {
  return {
    windowCount: definitions.length + 1,
    tabCount:
      definitions.reduce((sum, definition) => sum + definition.tabs.length, 0) +
      1,
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ensureBuildExists() {
  if (!existsSync(EXTENSION_PATH)) {
    throw new Error(
      `Missing Chrome extension build at ${EXTENSION_PATH}. Run pnpm --filter tab-manager-v2 build:chrome first.`,
    )
  }
}

function ensureMagickExists() {
  const result = spawnSync('magick', ['-version'], { stdio: 'ignore' })
  if (result.status !== 0) {
    throw new Error('ImageMagick `magick` is required to export PNG24 assets.')
  }
}

async function initExtensionPage() {
  const userDataDir = mkdtempSync(join(tmpdir(), 'tmv2-release-'))
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
  await controlPage.goto(fullPageUrl)
  await controlPage.waitForTimeout(600)
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
  for (let attempt = 0; attempt < 50; attempt += 1) {
    popupPage =
      context
        .pages()
        .find(
          (candidate) =>
            candidate.url() === fullPageUrl && candidate !== controlPage,
        ) || null
    if (popupPage) {
      break
    }
    await sleep(100)
  }
  if (!popupPage) {
    throw new Error('Failed to locate the dedicated popup window page.')
  }

  await popupPage.setViewportSize(VIEWPORT)
  await controlPage.close()
  await popupPage.bringToFront()
  return { context, page: popupPage, fullPageUrl, userDataDir }
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

async function focusDemoWindow(page, createdWindows, windowIndex, tabIndex = 0) {
  const targetWindow =
    createdWindows[
      Math.max(0, Math.min(windowIndex, Math.max(createdWindows.length - 1, 0)))
    ]
  if (!targetWindow) {
    throw new Error(`Missing target demo window at index ${windowIndex}`)
  }
  const targetTabId =
    targetWindow.tabIds[
      Math.max(0, Math.min(tabIndex, Math.max(targetWindow.tabIds.length - 1, 0)))
    ]
  if (typeof targetTabId !== 'number') {
    throw new Error(`Missing target demo tab for window ${targetWindow.windowId}`)
  }
  await page.evaluate(
    async ({ windowId, tabId }) => {
      await chrome.storage.local.set({
        lastFocusedWindowId: windowId,
        _selfPopupActive: false,
      })
      await chrome.tabs.update(tabId, { active: true })
    },
    {
      windowId: targetWindow.windowId,
      tabId: targetTabId,
    },
  )
  await page.waitForTimeout(UI_SETTLE_DELAY_MS)
  return targetWindow.windowId
}

async function scrollWindowIntoView(page, windowId) {
  const selector = `[data-testid="window-card-${windowId}"]`
  await page.waitForSelector(selector, { timeout: UI_READY_TIMEOUT_MS })
  await page.evaluate((targetSelector) => {
    const target = document.querySelector(targetSelector)
    if (target) {
      target.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, selector)
  await page.waitForTimeout(UI_SETTLE_DELAY_MS)
  await page.waitForTimeout(SCROLLBAR_FADE_DELAY_MS)
}

async function createDemoWindows(page, windows) {
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
            return tabs.slice().sort((a, b) => a.index - b.index)
          }
          await delay(waitOptions.pollIntervalMs)
        }
        const tabs = await chrome.tabs.query({ windowId })
        return tabs.slice().sort((a, b) => a.index - b.index)
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
        const urls = definition.tabs
        const createdWindow = await createWindowWithTabs(urls)
        createdBase.push({
          definition,
          urls,
          ...createdWindow,
        })
      }

      const created = []
      for (const {
        definition,
        urls,
        windowId,
        tabIds,
        expectedCount,
      } of createdBase) {
        const groups = []
        for (const group of definition.groups || []) {
          const groupTabIds = pickTabIds(urls, tabIds, group.urls)
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
      },
    },
  )
}

function pathForScreenshot(name) {
  mkdirSync(PNG_OUTPUT_DIR, { recursive: true })
  return join(PNG_OUTPUT_DIR, `${name}.png`)
}

function convertToPng24(sourcePath, outputPath) {
  const result = spawnSync(
    'magick',
    [
      sourcePath,
      '-background',
      'white',
      '-alpha',
      'remove',
      '-alpha',
      'off',
      `PNG24:${outputPath}`,
    ],
    { stdio: 'inherit' },
  )
  if (result.status !== 0) {
    throw new Error(`ImageMagick conversion failed for ${outputPath}`)
  }
}

async function waitForNoVisibleInterstitialText(page, name) {
  try {
    await page.waitForFunction(
      (snippets) => {
        const bodyText = String(document.body?.innerText || '').toLowerCase()
        return !snippets.some((snippet) => bodyText.includes(snippet))
      },
      {
        timeout: 15000,
        polling: 500,
      },
      INTERSTITIAL_TITLE_SNIPPETS,
    )
  } catch {
    console.log(
      `    continuing despite visible interstitial text before ${name}.png`,
    )
  }
}

async function saveScreenshot(page, name) {
  const rawDir = join(tmpdir(), 'tmv2-release-raw')
  mkdirSync(rawDir, { recursive: true })
  const rawPath = join(rawDir, `${name}-raw.png`)
  const outputPath = pathForScreenshot(name)
  await page.bringToFront()
  await waitForNoVisibleInterstitialText(page, name)
  await page.waitForTimeout(SCREENSHOT_SETTLE_DELAY_MS)
  await page.screenshot({
    path: rawPath,
    animations: 'disabled',
  })
  convertToPng24(rawPath, outputPath)
  const identify = spawnSync(
    'magick',
    ['identify', '-format', '%wx%h %[channels]', outputPath],
    { encoding: 'utf8' },
  )
  const details = identify.status === 0 ? identify.stdout.trim() : 'unknown'
  console.log(`${name}.png -> ${details}`)
}

async function captureOverview(page, fullPageUrl, theme) {
  await resetScenario(page, fullPageUrl, theme.settings)
  console.log('    creating overview demo windows')
  const createdWindows = await createDemoWindows(page, DENSE_OVERVIEW_WINDOWS)
  console.log('    focusing overview target window')
  const targetWindowId = await focusDemoWindow(
    page,
    createdWindows,
    DENSE_OVERVIEW_FOCUS_WINDOW_INDEX,
    DENSE_OVERVIEW_FOCUS_TAB_INDEX,
  )
  console.log('    reloading overview popup')
  await reloadPopup(page)
  console.log('    waiting for overview scenario counts')
  await waitForScenarioReady(page, scenarioCounts(DENSE_OVERVIEW_WINDOWS))
  console.log('    scrolling overview target window into view')
  await scrollWindowIntoView(page, targetWindowId)
  await saveScreenshot(page, screenshotName('01-overview-groups', theme.name))
}

async function captureGroupEditing(page, fullPageUrl, theme) {
  await resetScenario(page, fullPageUrl, theme.settings)
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
  const [windowData] = await createDemoWindows(page, windows)
  const groupId = windowData.groups[0].groupId
  await reloadPopup(page)
  await waitForScenarioReady(page, scenarioCounts(windows))
  await page.getByTestId(`tab-group-header-${groupId}`).hover()
  await page.getByTestId(`tab-group-menu-${groupId}`).click()
  await page.getByTestId(`tab-group-menu-rename-${groupId}`).click()
  await page.waitForSelector(`[data-testid="tab-group-editor-${groupId}"]`)
  await page
    .getByTestId(`tab-group-editor-title-${groupId}`)
    .fill('AI Workspace')
  await saveScreenshot(page, screenshotName('02-group-editing', theme.name))
}

async function captureSearchGroups(page, fullPageUrl, theme) {
  await resetScenario(page, fullPageUrl, theme.settings)
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
  const [windowData] = await createDemoWindows(page, windows)
  const groupId = windowData.groups[0].groupId
  await reloadPopup(page)
  await waitForScenarioReady(page, scenarioCounts(windows))
  await page.waitForSelector(`[data-testid="tab-group-header-${groupId}"]`)
  const searchInput = page.locator('input[placeholder*="Search tabs or URLs"]')
  await searchInput.fill('jenny')
  await page.waitForTimeout(250)
  await saveScreenshot(page, screenshotName('03-search-groups', theme.name))
}

async function captureDuplicateCleanup(page, fullPageUrl, theme) {
  await resetScenario(page, fullPageUrl, {
    ...theme.settings,
    highlightDuplicatedTab: true,
    ignoreHash: false,
  })
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
  console.log('    creating duplicate cleanup demo windows')
  await createDemoWindows(page, windows)
  console.log('    reloading duplicate cleanup popup')
  await reloadPopup(page)
  console.log('    waiting for duplicate cleanup scenario counts')
  await waitForScenarioReady(page, scenarioCounts(windows))
  await page.waitForSelector(
    'button[aria-label^="Clean "][aria-label*="duplicate"]',
  )
  await saveScreenshot(page, screenshotName('04-duplicate-cleanup', theme.name))
}

async function captureKeyboardShortcuts(page, fullPageUrl, theme) {
  await resetScenario(page, fullPageUrl, theme.settings)
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
  await createDemoWindows(page, windows)
  await reloadPopup(page)
  await waitForScenarioReady(page, scenarioCounts(windows))
  await page.locator('button[aria-label="Show shortcut hints"]').first().click()
  await page
    .getByRole('heading', { name: 'Keyboard Shortcuts', exact: true })
    .waitFor()
  await page.getByRole('searchbox', { name: 'Search' }).fill('group')
  await saveScreenshot(
    page,
    screenshotName('05-keyboard-shortcuts', theme.name),
  )
}

async function captureGroupedTabsFocus(page, fullPageUrl, theme) {
  await resetScenario(page, fullPageUrl, {
    ...theme.settings,
    tabWidth: 22,
  })
  console.log('    creating grouped focus demo windows')
  const createdWindows = await createDemoWindows(page, DENSE_OVERVIEW_WINDOWS)
  console.log('    focusing grouped focus target window')
  const targetWindowId = await focusDemoWindow(
    page,
    createdWindows,
    DENSE_OVERVIEW_FOCUS_WINDOW_INDEX,
    DENSE_OVERVIEW_FOCUS_TAB_INDEX,
  )
  console.log('    reloading grouped focus popup')
  await reloadPopup(page)
  console.log('    waiting for grouped focus scenario counts')
  await waitForScenarioReady(page, scenarioCounts(DENSE_OVERVIEW_WINDOWS))
  console.log('    scrolling grouped focus target window into view')
  await scrollWindowIntoView(page, targetWindowId)
  await saveScreenshot(
    page,
    screenshotName('06-grouped-tabs-focus', theme.name),
  )
}

async function captureSettings(page, fullPageUrl, theme) {
  await resetScenario(page, fullPageUrl, theme.settings)
  const windows = [
    {
      tabs: [
        realUrl('launch/release-roadmap'),
        realUrl('research/tab-groups-api'),
        realUrl('reading/design-refresh'),
      ],
      groups: [
        {
          title: 'Workspace',
          color: 'purple',
          urls: [
            realUrl('launch/release-roadmap'),
            realUrl('research/tab-groups-api'),
          ],
        },
      ],
    },
  ]
  await createDemoWindows(page, windows)
  await reloadPopup(page)
  await waitForScenarioReady(page, scenarioCounts(windows))
  await page.locator('button[aria-label="Settings"]').first().click()
  await page.getByText('Theme & density').waitFor()
  await saveScreenshot(page, screenshotName('07-settings', theme.name))
}

async function captureCommandPalette(page, fullPageUrl, theme) {
  await resetScenario(page, fullPageUrl, theme.settings)
  const windows = [
    {
      tabs: [
        realUrl('launch/release-roadmap'),
        realUrl('launch/store-copy'),
        realUrl('reading/accessibility-audit'),
        realUrl('reading/changelog-draft'),
        realUrl('brand/jenny-youtube'),
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
  await createDemoWindows(page, windows)
  await reloadPopup(page)
  await waitForScenarioReady(page, scenarioCounts(windows))
  const searchInput = page.locator('input[placeholder*="Search tabs or URLs"]')
  await searchInput.fill('>sort')
  await page.waitForSelector('.MuiAutocomplete-option')
  await saveScreenshot(page, screenshotName('08-command-palette', theme.name))
}

async function main() {
  ensureBuildExists()
  ensureMagickExists()
  if (REQUESTED_THEMES.length === 0 && REQUESTED_SCENARIOS.size === 0) {
    rmSync(PNG_OUTPUT_DIR, { recursive: true, force: true })
  }
  mkdirSync(OUTPUT_ROOT_DIR, { recursive: true })

  const scenarioSteps = [
    {
      id: 'overview',
      label: '01 overview groups',
      run: captureOverview,
    },
    {
      id: 'group-editing',
      label: '02 group editing',
      run: captureGroupEditing,
    },
    {
      id: 'search-groups',
      label: '03 search groups',
      run: captureSearchGroups,
    },
    {
      id: 'duplicate-cleanup',
      label: '04 duplicate cleanup',
      run: captureDuplicateCleanup,
    },
    {
      id: 'keyboard-shortcuts',
      label: '05 keyboard shortcuts',
      run: captureKeyboardShortcuts,
    },
    {
      id: 'grouped-tabs-focus',
      label: '06 grouped tabs focus',
      run: captureGroupedTabsFocus,
    },
    {
      id: 'settings',
      label: '07 settings',
      run: captureSettings,
    },
    {
      id: 'command-palette',
      label: '08 command palette',
      run: captureCommandPalette,
    },
  ].filter(
    (scenario) =>
      REQUESTED_SCENARIOS.size === 0 || REQUESTED_SCENARIOS.has(scenario.id),
  )
  const themeVariants = THEME_VARIANTS.filter(
    (theme) =>
      REQUESTED_THEMES.length === 0 || REQUESTED_THEMES.includes(theme.name),
  )

  let context = null
  let userDataDir = null
  try {
    const init = await initExtensionPage()
    context = init.context
    userDataDir = init.userDataDir
    const { page, fullPageUrl } = init

    for (const theme of themeVariants) {
      console.log(`Capturing ${theme.name} theme`)
      for (const scenario of scenarioSteps) {
        console.log(`  ${scenario.label}`)
        await scenario.run(page, fullPageUrl, theme)
      }
    }
  } finally {
    if (context) {
      await context.close()
    }
    if (userDataDir) {
      rmSync(userDataDir, { recursive: true, force: true })
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
