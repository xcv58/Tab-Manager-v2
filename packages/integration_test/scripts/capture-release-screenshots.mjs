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
const TAB_STATE_STABLE_POLLS = 12
const TAB_POST_LOAD_SETTLE_DELAY_MS = 1800
const SCREENSHOT_SETTLE_DELAY_MS = 600
const SCROLLBAR_FADE_DELAY_MS = 2400
const TAB_CREATE_BATCH_SIZE = 6
const TAB_CREATE_BATCH_DELAY_MS = 2500
const DENSE_OVERVIEW_FOCUS_WINDOW_INDEX = 5
const DENSE_OVERVIEW_FOCUS_TAB_INDEX = 1
const GROUPED_FOCUS_WINDOW_INDEX = 2
const GROUPED_FOCUS_TAB_INDEX = 1
const GROUPED_FOCUS_GROUP_INDEX = 0
const INTERSTITIAL_TITLE_SNIPPETS = [
  'just a moment',
  'are you a robot',
  'attention required',
  'checking your browser',
  'please wait',
  'access denied',
  'captcha',
  'forbidden',
  'request unsuccessful',
  'security check',
  'verify you are human',
]
const REQUIRED_TAB_TITLE_RULES = [
  {
    urlPrefix: 'https://www.youtube.com/@jennytv1',
    titleIncludes: 'jenny tv',
  },
  {
    urlPrefix: 'https://news.ycombinator.com/',
    titleIncludes: 'hacker news',
  },
  {
    urlPrefix: 'https://www.postgresql.org/',
    titleIncludes: 'postgresql',
    allowStableLoading: true,
  },
  {
    urlPrefix: 'https://web.dev/',
    titleIncludes: 'web.dev',
  },
  {
    urlPrefix: 'https://testing-library.com/',
    titleIncludes: 'testing library',
  },
  {
    urlPrefix: 'https://arstechnica.com/',
    titleIncludes: 'ars technica',
    allowStableLoading: true,
  },
  {
    urlPrefix: 'https://www.engadget.com/',
    titleIncludes: 'engadget',
    allowStableLoading: true,
  },
  {
    urlPrefix: 'https://apnews.com/',
    titleIncludes: 'associated press news',
    allowStableLoading: true,
  },
  {
    urlPrefix: 'https://www.theguardian.com/international',
    titleIncludes: 'the guardian',
    allowStableLoading: true,
  },
  {
    urlPrefix: 'https://www.npr.org/',
    titleIncludes: 'npr',
    allowStableLoading: true,
  },
  {
    urlPrefix: 'https://www.theverge.com/',
    titleIncludes: 'the verge',
    allowStableLoading: true,
  },
  {
    urlPrefix: 'https://techcrunch.com/',
    titleIncludes: 'techcrunch',
    allowStableLoading: true,
  },
]
const CANONICAL_SOURCE_ALIASES = {
  'https://azure.microsoft.com/': ['https://azure.microsoft.com/en-us'],
  'https://blog.mozilla.org/': ['https://blog.mozilla.org/en'],
  'https://developer.mozilla.org/': ['https://developer.mozilla.org/en-us'],
  'https://gemini.google.com/': ['https://gemini.google.com/app'],
  'https://gitlab.com/': ['https://about.gitlab.com/'],
  'https://notion.so/': ['https://notion.com/'],
  'https://sentry.io/': ['https://sentry.io/welcome'],
  'https://zoom.us/': ['https://zoom.com/'],
}
const FALLBACK_TAB_ICON_DATA_URL = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
    <path fill="none" stroke="#64748b" stroke-linejoin="round" stroke-width="1.5" d="M4.5 2.5h7l4 4v11h-11z"/>
    <path fill="none" stroke="#64748b" stroke-linejoin="round" stroke-width="1.5" d="M11.5 2.5v4h4"/>
  </svg>
`)}`
const FALLBACK_TAB_ICON_STATE = '(deterministic-fallback)'
const ROOT_DIR = join(fileURLToPath(new URL('../../..', import.meta.url)))
const OUTPUT_ROOT_DIR = join(ROOT_DIR, 'docs/assets/images/release-candidates')
const PNG_OUTPUT_DIR = join(OUTPUT_ROOT_DIR, 'png')
const EXTENSION_PATH = join(ROOT_DIR, 'packages/extension/build/build_chrome')
const REQUESTED_THEMES = String(process.env.RELEASE_SCREENSHOT_THEMES || '')
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
const GROUPED_FOCUS_TAB_WIDTH = VIEWPORT.width / 5 / DEFAULT_SETTINGS.fontSize

// Avoid URLs that frequently trigger bot checks during automation captures.
const REAL_URLS = {
  'brand/jenny-home': 'https://jenny.media/',
  'brand/tab-manager': 'https://tab.jenny.media/',
  'brand/jenny-youtube': 'https://www.youtube.com/@JennyTV1',
  'launch/release-roadmap': 'https://developer.chrome.com/',
  'launch/store-copy': 'https://developer.mozilla.org/',
  'launch/final-checklist': 'https://github.com/',
  'launch/support-plan': 'https://vercel.com/',
  'launch/qa-signoff': 'https://react.dev/',
  'launch/rollout-plan': 'https://nodejs.org/',
  'research/tab-groups-api': 'https://developer.chrome.com/docs/extensions/',
  'research/firefox-parity': 'https://extensionworkshop.com/',
  'research/edge-review':
    'https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/',
  'research/keyboard-flows': 'https://playwright.dev/',
  'research/ux-followups': 'https://vite.dev/',
  'research/screenshot-brief': 'https://news.ycombinator.com/',
  'reading/design-refresh': 'https://www.smashingmagazine.com/',
  'reading/accessibility-audit': 'https://web.dev/',
  'reading/performance-review': 'https://pagespeed.web.dev/',
  'reading/changelog-draft': 'https://css-tricks.com/',
  'support/customer-4821': 'https://news.ycombinator.com/',
  'support/customer-5104': 'https://apnews.com/',
  'support/release-mail': 'https://www.reddit.com/r/chrome_extensions/',
  'support/docs-ticket':
    'https://developer.chrome.com/docs/extensions/get-started/',
  'ops/duplicate-tabs': 'https://jenny.media/',
  'ops/window-groups': 'https://tab.jenny.media/',
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
      'https://chatgpt.com/',
      'https://claude.ai/login',
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
      'https://github.com/Canva',
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
      'https://tab.jenny.media/',
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
      'https://github.com/redis/redis',
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
      'https://github.com/Medium',
    ],
  },
  {
    title: 'Creators',
    color: 'green',
    collapsed: true,
    urls: [
      'https://substack.com/',
      'https://github.com/topics/content-creation',
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
      'https://www.npr.org/',
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
      'https://huggingface.co/blog',
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
      'https://github.com/eslint/eslint',
      'https://github.com/prettier/prettier',
      'https://github.com/vitest-dev/vitest',
    ],
  },
  {
    title: 'Testing',
    color: 'yellow',
    urls: [
      'https://www.youtube.com/@JennyTV1',
      'https://playwright.dev/',
      'https://testing-library.com/',
      'https://github.com/storybookjs/storybook',
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
    ignoreDefaultArgs: ['--enable-automation'],
    screen: VIEWPORT,
    viewport: VIEWPORT,
    args: [
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
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
  const controller = await popupPage.evaluate(async (expectedUrl) => {
    const currentWindow = await chrome.windows.getCurrent({ populate: true })
    const tabs = currentWindow.tabs || []
    const controllerTab = tabs.find((tab) => tab.url === expectedUrl)
    if (
      typeof currentWindow.id !== 'number' ||
      typeof controllerTab?.id !== 'number' ||
      tabs.length !== 1
    ) {
      throw new Error(
        `Unexpected controller browser state: ${JSON.stringify({
          windowId: currentWindow.id,
          tabIds: tabs.map((tab) => tab.id),
          urls: tabs.map((tab) => tab.url),
        })}`,
      )
    }
    return {
      windowId: currentWindow.id,
      tabId: controllerTab.id,
    }
  }, fullPageUrl)
  return { context, controller, page: popupPage, fullPageUrl, userDataDir }
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
      expectedWindowCount: counts.windowCount,
      expectedTabCount: counts.tabCount,
    },
    {
      timeout: TAB_LOAD_TIMEOUT_MS,
      polling: TAB_LOAD_POLL_INTERVAL_MS,
    },
  )
  await page.waitForTimeout(UI_SETTLE_DELAY_MS + 2000)
}

async function focusDemoWindow(
  page,
  createdWindows,
  windowIndex,
  tabIndex = 0,
) {
  const targetWindow =
    createdWindows[
      Math.max(0, Math.min(windowIndex, Math.max(createdWindows.length - 1, 0)))
    ]
  if (!targetWindow) {
    throw new Error(`Missing target demo window at index ${windowIndex}`)
  }
  const targetTabId =
    targetWindow.tabIds[
      Math.max(
        0,
        Math.min(tabIndex, Math.max(targetWindow.tabIds.length - 1, 0)),
      )
    ]
  if (typeof targetTabId !== 'number') {
    throw new Error(
      `Missing target demo tab for window ${targetWindow.windowId}`,
    )
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
        inline: 'start',
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
        for (let attempt = 0; attempt < waitOptions.maxAttempts; attempt += 1) {
          let hasExpectedCounts = true
          for (const createdWindow of createdWindows) {
            const tabs = await chrome.tabs.query({ windowId: createdWindow.id })
            if (tabs.length !== createdWindow.expectedCount) {
              hasExpectedCounts = false
              break
            }
          }
          if (hasExpectedCounts) {
            await delay(waitOptions.postLoadSettleMs)
            return
          }
          await delay(waitOptions.pollIntervalMs)
        }
        throw new Error('Timed out waiting for all demo window tab counts')
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
        const [firstTab] = tabs
        if (typeof firstTab?.id !== 'number') {
          throw new Error(`Missing first tab for demo window ${windowId}`)
        }
        await chrome.tabs.update(firstTab.id, { active: true })
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
          groups.push({
            groupId,
            windowId,
            tabIds: groupTabIds,
            title: group.title,
            color: group.color,
            collapsed: !!group.collapsed,
          })
        }
        created.push({ windowId, tabIds, expectedCount, groups, urls })
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
        expectedTabs: item.tabIds.map((tabId, index) => ({
          tabId,
          windowId: item.windowId,
          expectedUrl: item.urls[index],
        })),
      }))
    },
    {
      definitions: windows,
      waitOptions: {
        maxAttempts: Math.ceil(TAB_LOAD_TIMEOUT_MS / TAB_LOAD_POLL_INTERVAL_MS),
        pollIntervalMs: TAB_LOAD_POLL_INTERVAL_MS,
        postLoadSettleMs: TAB_POST_LOAD_SETTLE_DELAY_MS,
        batchSize: TAB_CREATE_BATCH_SIZE,
        batchPauseMs: TAB_CREATE_BATCH_DELAY_MS,
      },
    },
  )
}

function expectedTabsFor(createdWindows) {
  return createdWindows.flatMap((windowData) => windowData.expectedTabs)
}

async function expectedBrowserStateFor(page, controller, createdWindows) {
  const expectedWindows = [
    {
      windowId: controller.windowId,
      tabIds: [controller.tabId],
    },
    ...createdWindows.map((windowData) => ({
      windowId: windowData.windowId,
      tabIds: windowData.expectedTabs.map((tab) => tab.tabId),
    })),
  ]
  const definedGroups = createdWindows.flatMap(
    (windowData) => windowData.groups,
  )
  const activeTabIdsByWindow = await page.evaluate(
    async (windowIds) => {
      const activeEntries = []
      for (const windowId of windowIds) {
        const [activeTab] = await chrome.tabs.query({ active: true, windowId })
        if (typeof activeTab?.id !== 'number') {
          throw new Error(`Missing active tab for expected window ${windowId}`)
        }
        activeEntries.push([windowId, activeTab.id])
      }
      return activeEntries
    },
    expectedWindows.map((expectation) => expectation.windowId),
  )
  const activeTabIdByWindowId = new Map(activeTabIdsByWindow)
  const expectedGroups = definedGroups.map((group) => ({
    ...group,
    collapsed: group.tabIds.includes(activeTabIdByWindowId.get(group.windowId))
      ? false
      : group.collapsed,
  }))
  await page.evaluate(async (groupExpectations) => {
    for (const expectation of groupExpectations) {
      const group = await chrome.tabGroups.get(expectation.groupId)
      if (group.collapsed !== expectation.collapsed) {
        await chrome.tabGroups.update(expectation.groupId, {
          collapsed: expectation.collapsed,
        })
      }
    }
  }, expectedGroups)
  await page.waitForTimeout(UI_SETTLE_DELAY_MS)
  return {
    expectedTabs: expectedTabsFor(createdWindows),
    expectedGroups,
    expectedWindows: expectedWindows.map((expectation) => ({
      ...expectation,
      activeTabId: activeTabIdByWindowId.get(expectation.windowId),
    })),
  }
}

async function assertFinalCaptureState(page, name, browserState) {
  await page.evaluate(
    async (expectations) => {
      const normalizeWindowTabs = (windows) =>
        windows
          .filter((win) => typeof win.windowId === 'number')
          .map((win) => ({
            windowId: win.windowId,
            activeTabId: win.activeTabId,
            tabIds: win.tabIds.filter((tabId) => typeof tabId === 'number'),
          }))
          .sort((a, b) => a.windowId - b.windowId)
      const normalizeGroups = (groups) =>
        groups
          .filter((group) => typeof group.groupId === 'number')
          .map((group) => ({
            groupId: group.groupId,
            windowId: group.windowId,
            tabIds: group.tabIds
              .filter((tabId) => typeof tabId === 'number')
              .sort((a, b) => a - b),
            title: String(group.title || ''),
            color: group.color,
            collapsed: !!group.collapsed,
          }))
          .sort((a, b) => a.groupId - b.groupId)
      const canonicalSourceUrl = (url) => {
        try {
          const parsedUrl = new URL(url)
          const protocol = parsedUrl.protocol.toLowerCase()
          const hostname = parsedUrl.hostname
            .toLowerCase()
            .replace(/^www\./, '')
          const port = parsedUrl.port ? `:${parsedUrl.port}` : ''
          const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/'
          return `${protocol}//${hostname}${port}${pathname}`
        } catch {
          return ''
        }
      }
      const sourceMatchesExpected = (expectedUrl, actualUrl) => {
        const expectedSource = canonicalSourceUrl(expectedUrl)
        const actualSource = canonicalSourceUrl(actualUrl)
        const allowedSources = [
          expectedSource,
          ...(expectations.canonicalSourceAliases[expectedSource] || []),
        ].map(canonicalSourceUrl)
        return (
          expectedSource.length > 0 && allowedSources.includes(actualSource)
        )
      }
      const isGenericTitle = (title, url) => {
        const normalizedTitle = title
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/[/?#]+$/, '')
        const normalizedUrl = url
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/[/?#]+$/, '')
        return (
          normalizedTitle ===
            (() => {
              try {
                return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
              } catch {
                return ''
              }
            })() ||
          normalizedTitle === normalizedUrl ||
          title.startsWith('http://') ||
          title.startsWith('https://')
        )
      }
      const faviconStateFor = (tab) => {
        const faviconUrl = String(tab?.favIconUrl || '').trim()
        if (!faviconUrl) {
          return expectations.fallbackIconState
        }
        try {
          const normalizedUrl = new URL(faviconUrl)
          normalizedUrl.search = ''
          normalizedUrl.hash = ''
          return normalizedUrl.href
        } catch {
          return faviconUrl
        }
      }
      const liveWindows = await chrome.windows.getAll({ populate: true })
      const expectedState = normalizeWindowTabs(expectations.expectedWindows)
      const liveState = normalizeWindowTabs(
        liveWindows.map((win) => ({
          windowId: win.id,
          activeTabId: (win.tabs || []).find((tab) => tab.active)?.id,
          tabIds: [...(win.tabs || [])]
            .sort((a, b) => a.index - b.index)
            .map((tab) => tab.id),
        })),
      )
      if (JSON.stringify(liveState) !== JSON.stringify(expectedState)) {
        throw new Error(
          `Unexpected global browser state: ${JSON.stringify({
            expectedState,
            liveState,
          })}`,
        )
      }
      const allLiveTabs = liveWindows.flatMap((win) => win.tabs || [])
      const groupTabIdsByGroupId = new Map()
      for (const tab of allLiveTabs) {
        if (typeof tab.groupId !== 'number' || tab.groupId < 0) {
          continue
        }
        const groupTabIds = groupTabIdsByGroupId.get(tab.groupId) || []
        groupTabIds.push(tab.id)
        groupTabIdsByGroupId.set(tab.groupId, groupTabIds)
      }
      const liveGroups = await chrome.tabGroups.query({})
      const liveGroupState = normalizeGroups(
        liveGroups.map((group) => ({
          groupId: group.id,
          windowId: group.windowId,
          tabIds: groupTabIdsByGroupId.get(group.id) || [],
          title: group.title,
          color: group.color,
          collapsed: group.collapsed,
        })),
      )
      const expectedGroupState = normalizeGroups(expectations.expectedGroups)
      if (
        JSON.stringify(liveGroupState) !== JSON.stringify(expectedGroupState)
      ) {
        throw new Error(
          `Unexpected global tab-group state: ${JSON.stringify({
            expectedGroupState,
            liveGroupState,
          })}`,
        )
      }
      const liveTabsById = new Map(allLiveTabs.map((tab) => [tab.id, tab]))
      const unsettledTabs = []
      for (const expectation of expectations.expectedTabs) {
        const tab = liveTabsById.get(expectation.tabId)
        const title = String(tab?.title || '')
          .trim()
          .toLowerCase()
        const url = String(tab?.url || '')
          .trim()
          .toLowerCase()
        const status = String(tab?.status || '')
          .trim()
          .toLowerCase()
        const expectedUrl = expectation.expectedUrl.toLowerCase()
        const matchingTitleRule = expectations.requiredTitleRules.find((rule) =>
          expectedUrl.startsWith(rule.urlPrefix),
        )
        const titleRuleSatisfied = matchingTitleRule?.titleIncludes
          ? title.includes(matchingTitleRule.titleIncludes)
          : !isGenericTitle(title, url)
        const statusSettled =
          status === 'complete' ||
          (matchingTitleRule?.allowStableLoading && status === 'loading')
        const blockedTitle = expectations.blockedTitleSnippets.find((snippet) =>
          title.includes(snippet),
        )
        const faviconState = faviconStateFor(tab)
        if (
          !tab ||
          title.length === 0 ||
          !titleRuleSatisfied ||
          !statusSettled ||
          !sourceMatchesExpected(expectedUrl, url) ||
          url.startsWith('chrome-error://') ||
          blockedTitle ||
          faviconState.length === 0
        ) {
          unsettledTabs.push({
            tabId: expectation.tabId,
            expectedUrl,
            status,
            title,
            url,
            faviconState,
            requiredTitle: matchingTitleRule?.titleIncludes,
            allowStableLoading: matchingTitleRule?.allowStableLoading,
            blockedTitle,
          })
        }
      }
      if (unsettledTabs.length > 0) {
        throw new Error(
          `Unexpected final tab readiness state: ${JSON.stringify(unsettledTabs)}`,
        )
      }

      const elementIsVisible = (element) => {
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)
        return (
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth &&
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0'
        )
      }
      const visibleTabRows = Array.from(
        document.querySelectorAll('[data-testid^="tab-row-"]'),
      ).filter(elementIsVisible)
      const clippedRows = []
      for (const tabRow of visibleTabRows) {
        const rect = tabRow.getBoundingClientRect()
        const clipRect = {
          left: 0,
          right: window.innerWidth,
          top: 0,
          bottom: window.innerHeight,
        }
        let ancestor = tabRow.parentElement
        while (ancestor && ancestor !== document.body) {
          const style = window.getComputedStyle(ancestor)
          const ancestorRect = ancestor.getBoundingClientRect()
          if (style.overflowX !== 'visible') {
            clipRect.left = Math.max(clipRect.left, ancestorRect.left)
            clipRect.right = Math.min(clipRect.right, ancestorRect.right)
          }
          if (style.overflowY !== 'visible') {
            clipRect.top = Math.max(clipRect.top, ancestorRect.top)
            clipRect.bottom = Math.min(clipRect.bottom, ancestorRect.bottom)
          }
          ancestor = ancestor.parentElement
        }
        const tolerance = 1
        if (
          rect.left < clipRect.left - tolerance ||
          rect.right > clipRect.right + tolerance ||
          rect.top < clipRect.top - tolerance ||
          rect.bottom > clipRect.bottom + tolerance
        ) {
          clippedRows.push({
            testId: tabRow.getAttribute('data-testid'),
            rect: {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
            },
            clipRect,
          })
        }
      }
      if (clippedRows.length > 0) {
        throw new Error(
          `Visible tab rows are clipped before ${expectations.name}.png: ${JSON.stringify(
            clippedRows,
          )}`,
        )
      }

      const mountedRowDiagnostics = []
      const expectedUrlByTabId = new Map(
        expectations.expectedTabs.map((expectation) => [
          expectation.tabId,
          expectation.expectedUrl.toLowerCase(),
        ]),
      )
      for (const tabRow of document.querySelectorAll(
        '[data-testid^="tab-row-"]',
      )) {
        const tabId = Number(tabRow.getAttribute('data-testid')?.slice(8))
        const tab = Number.isFinite(tabId) ? liveTabsById.get(tabId) : undefined
        const title = String(tab?.title || '')
          .trim()
          .toLowerCase()
        const url = String(tab?.url || '')
          .trim()
          .toLowerCase()
        const expectedUrl = expectedUrlByTabId.get(tabId)
        const isControllerTab = url.startsWith(
          `${location.origin.toLowerCase()}/`,
        )
        const icon = tabRow.querySelector('img')
        const iconSrc = String(icon?.currentSrc || icon?.src || '')
        if (
          !tab ||
          !title ||
          !String(tabRow.innerText || '')
            .toLowerCase()
            .includes(title) ||
          (!expectedUrl && !isControllerTab) ||
          (!!expectedUrl && !sourceMatchesExpected(expectedUrl, url)) ||
          !icon ||
          !icon.complete ||
          icon.naturalWidth <= 0 ||
          !iconSrc ||
          iconSrc.endsWith('/empty.png')
        ) {
          mountedRowDiagnostics.push({
            tabId,
            title,
            url,
            expectedUrl: expectedUrl || '(unregistered)',
            rowText: String(tabRow.innerText || '').trim(),
            iconComplete: icon?.complete,
            iconNaturalWidth: icon?.naturalWidth,
            iconSrc,
          })
        }
      }
      if (mountedRowDiagnostics.length > 0) {
        throw new Error(
          `Unexpected final mounted tab rows before ${expectations.name}.png: ${JSON.stringify(
            mountedRowDiagnostics,
          )}`,
        )
      }

      const visibleTooltips = Array.from(
        document.querySelectorAll('[role="tooltip"]'),
      ).filter(elementIsVisible)
      if (visibleTooltips.length > 0) {
        throw new Error(
          `Visible tooltip before ${expectations.name}.png: ${JSON.stringify(
            visibleTooltips.map((tooltip) => tooltip.textContent),
          )}`,
        )
      }

      const visibleText = []
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
      )
      let textNode = walker.nextNode()
      while (textNode) {
        if (
          textNode.parentElement &&
          elementIsVisible(textNode.parentElement)
        ) {
          visibleText.push(textNode.nodeValue || '')
        }
        textNode = walker.nextNode()
      }
      const viewportText = visibleText.join(' ').toLowerCase()
      const visibleInterstitial = expectations.blockedTitleSnippets.find(
        (snippet) => viewportText.includes(snippet),
      )
      if (visibleInterstitial) {
        throw new Error(
          `Visible interstitial text before ${expectations.name}.png: ${visibleInterstitial}`,
        )
      }
    },
    {
      ...browserState,
      name,
      blockedTitleSnippets: INTERSTITIAL_TITLE_SNIPPETS,
      canonicalSourceAliases: CANONICAL_SOURCE_ALIASES,
      fallbackIconState: FALLBACK_TAB_ICON_STATE,
      requiredTitleRules: REQUIRED_TAB_TITLE_RULES,
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
        const visibleText = []
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
        )
        let textNode = walker.nextNode()
        while (textNode) {
          const element = textNode.parentElement
          if (element) {
            const rect = element.getBoundingClientRect()
            const style = window.getComputedStyle(element)
            if (
              rect.bottom > 0 &&
              rect.right > 0 &&
              rect.top < window.innerHeight &&
              rect.left < window.innerWidth &&
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              style.opacity !== '0'
            ) {
              visibleText.push(textNode.nodeValue || '')
            }
          }
          textNode = walker.nextNode()
        }
        const viewportText = visibleText.join(' ').toLowerCase()
        return !snippets.some((snippet) => viewportText.includes(snippet))
      },
      INTERSTITIAL_TITLE_SNIPPETS,
      {
        timeout: 15000,
        polling: 500,
      },
    )
  } catch (error) {
    throw new Error(`Visible interstitial text before ${name}.png`, {
      cause: error,
    })
  }
}

async function waitForExpectedTabStates(page, browserState) {
  const { expectedGroups, expectedTabs, expectedWindows } = browserState
  await page.evaluate(
    async ({
      blockedTitleSnippets,
      canonicalSourceAliases,
      expectedGroups,
      expectedTabs,
      expectedWindows,
      fallbackIconState,
      maxAttempts,
      pollIntervalMs,
      requiredTitleRules,
      stablePolls,
    }) => {
      const delay = (ms) =>
        new Promise((resolve) => {
          setTimeout(resolve, ms)
        })
      const normalizedHost = (url) => {
        try {
          return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
        } catch {
          return ''
        }
      }
      const canonicalSourceUrl = (url) => {
        try {
          const parsedUrl = new URL(url)
          const protocol = parsedUrl.protocol.toLowerCase()
          const hostname = normalizedHost(url)
          const port = parsedUrl.port ? `:${parsedUrl.port}` : ''
          const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/'
          return `${protocol}//${hostname}${port}${pathname}`
        } catch {
          return ''
        }
      }
      const sourceMatchesExpected = (expectedUrl, actualUrl) => {
        const expectedSource = canonicalSourceUrl(expectedUrl)
        const actualSource = canonicalSourceUrl(actualUrl)
        const allowedSources = [
          expectedSource,
          ...(canonicalSourceAliases[expectedSource] || []),
        ].map(canonicalSourceUrl)
        return (
          expectedSource.length > 0 && allowedSources.includes(actualSource)
        )
      }
      const isGenericTitle = (title, url) => {
        const normalizedTitle = title
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/[/?#]+$/, '')
        const normalizedUrl = url
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/[/?#]+$/, '')
        return (
          normalizedTitle === normalizedHost(url) ||
          normalizedTitle === normalizedUrl ||
          title.startsWith('http://') ||
          title.startsWith('https://')
        )
      }
      const faviconStateFor = (tab) => {
        const faviconUrl = String(tab?.favIconUrl || '').trim()
        if (!faviconUrl) {
          return fallbackIconState
        }
        try {
          const normalizedUrl = new URL(faviconUrl)
          normalizedUrl.search = ''
          normalizedUrl.hash = ''
          return normalizedUrl.href
        } catch {
          return faviconUrl
        }
      }
      const normalizedExpectations = expectedTabs.map((expectation) => ({
        ...expectation,
        expectedUrl: expectation.expectedUrl.toLowerCase(),
      }))
      const expectationsByWindowId = new Map()
      for (const expectation of normalizedExpectations) {
        const windowExpectations =
          expectationsByWindowId.get(expectation.windowId) || []
        windowExpectations.push(expectation)
        expectationsByWindowId.set(expectation.windowId, windowExpectations)
      }
      const validateTab = (expectation, tab) => {
        const title = String(tab?.title || '')
          .trim()
          .toLowerCase()
        const url = String(tab?.url || '')
          .trim()
          .toLowerCase()
        const status = String(tab?.status || '')
          .trim()
          .toLowerCase()
        const matchingTitleRule = requiredTitleRules.find((rule) =>
          expectation.expectedUrl.startsWith(rule.urlPrefix),
        )
        const titleRuleSatisfied = matchingTitleRule?.titleIncludes
          ? title.includes(matchingTitleRule.titleIncludes)
          : !isGenericTitle(title, url)
        const statusSettled =
          status === 'complete' ||
          (matchingTitleRule?.allowStableLoading && status === 'loading')
        const blockedTitle = blockedTitleSnippets.find((snippet) =>
          title.includes(snippet),
        )
        const faviconState = faviconStateFor(tab)
        return {
          settled:
            !!tab &&
            title.length > 0 &&
            titleRuleSatisfied &&
            statusSettled &&
            sourceMatchesExpected(expectation.expectedUrl, url) &&
            !url.startsWith('chrome-error://') &&
            !blockedTitle &&
            faviconState.length > 0,
          state: {
            tabId: expectation.tabId,
            windowId: expectation.windowId,
            expectedUrl: expectation.expectedUrl,
            status,
            title,
            url,
            faviconState,
            requiredTitle: matchingTitleRule?.titleIncludes,
            allowStableLoading: matchingTitleRule?.allowStableLoading,
            blockedTitle,
          },
        }
      }
      const assertExpectedGlobalState = async () => {
        const normalizeWindowTabs = (windows) =>
          windows
            .filter((win) => typeof win.windowId === 'number')
            .map((win) => ({
              windowId: win.windowId,
              activeTabId: win.activeTabId,
              tabIds: win.tabIds.filter((tabId) => typeof tabId === 'number'),
            }))
            .sort((a, b) => a.windowId - b.windowId)
        const normalizeGroups = (groups) =>
          groups
            .filter((group) => typeof group.groupId === 'number')
            .map((group) => ({
              groupId: group.groupId,
              windowId: group.windowId,
              tabIds: group.tabIds
                .filter((tabId) => typeof tabId === 'number')
                .sort((a, b) => a - b),
              title: String(group.title || ''),
              color: group.color,
              collapsed: !!group.collapsed,
            }))
            .sort((a, b) => a.groupId - b.groupId)
        const liveWindows = await chrome.windows.getAll({ populate: true })
        const expectedState = normalizeWindowTabs(expectedWindows)
        const liveState = normalizeWindowTabs(
          liveWindows.map((win) => ({
            windowId: win.id,
            activeTabId: (win.tabs || []).find((tab) => tab.active)?.id,
            tabIds: [...(win.tabs || [])]
              .sort((a, b) => a.index - b.index)
              .map((tab) => tab.id),
          })),
        )
        if (JSON.stringify(liveState) !== JSON.stringify(expectedState)) {
          throw new Error(
            `Unexpected global browser state: ${JSON.stringify({
              expectedState,
              liveState,
            })}`,
          )
        }
        const groupTabIdsByGroupId = new Map()
        for (const tab of liveWindows.flatMap((win) => win.tabs || [])) {
          if (typeof tab.groupId !== 'number' || tab.groupId < 0) {
            continue
          }
          const groupTabIds = groupTabIdsByGroupId.get(tab.groupId) || []
          groupTabIds.push(tab.id)
          groupTabIdsByGroupId.set(tab.groupId, groupTabIds)
        }
        const liveGroups = await chrome.tabGroups.query({})
        const liveGroupState = normalizeGroups(
          liveGroups.map((group) => ({
            groupId: group.id,
            windowId: group.windowId,
            tabIds: groupTabIdsByGroupId.get(group.id) || [],
            title: group.title,
            color: group.color,
            collapsed: group.collapsed,
          })),
        )
        const expectedGroupState = normalizeGroups(expectedGroups)
        if (
          JSON.stringify(liveGroupState) !== JSON.stringify(expectedGroupState)
        ) {
          throw new Error(
            `Unexpected global tab-group state: ${JSON.stringify({
              expectedGroupState,
              liveGroupState,
            })}`,
          )
        }
      }
      const restoreExpectedPresentationState = async () => {
        for (const expectation of expectedWindows) {
          if (typeof expectation.activeTabId !== 'number') {
            throw new Error(
              `Missing expected active tab for window ${expectation.windowId}`,
            )
          }
          await chrome.tabs.update(expectation.activeTabId, { active: true })
        }
        for (const group of expectedGroups) {
          await chrome.tabGroups.update(group.groupId, {
            title: group.title,
            color: group.color,
            collapsed: group.collapsed,
          })
        }
      }

      await assertExpectedGlobalState()
      try {
        await Promise.all(
          [...expectationsByWindowId.values()].map(async (expectations) => {
            for (const expectation of expectations) {
              let tab = await chrome.tabs
                .get(expectation.tabId)
                .catch(() => undefined)
              if (validateTab(expectation, tab).settled) {
                continue
              }
              await chrome.tabs.update(expectation.tabId, { active: true })
              for (let attempt = 0; attempt < 40; attempt += 1) {
                tab = await chrome.tabs
                  .get(expectation.tabId)
                  .catch(() => undefined)
                if (validateTab(expectation, tab).settled) {
                  break
                }
                await delay(pollIntervalMs)
              }
            }
          }),
        )
      } finally {
        await restoreExpectedPresentationState()
      }

      let previousTabStateSignature = ''
      let stableStatePolls = 0
      let lastDiagnostics = []
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await assertExpectedGlobalState()
        const states = []
        const diagnostics = []
        for (const expectation of normalizedExpectations) {
          const tab = await chrome.tabs
            .get(expectation.tabId)
            .catch(() => undefined)
          const validation = validateTab(expectation, tab)
          states.push(validation.state)
          if (!validation.settled) {
            diagnostics.push(validation.state)
          }
        }
        const tabStateSignature = states
          .map(
            ({ tabId, status, title, url, faviconState }) =>
              `${tabId}:${status}:${url}:${title}:${faviconState}`,
          )
          .join('|')
        lastDiagnostics = diagnostics
        if (
          diagnostics.length === 0 &&
          tabStateSignature === previousTabStateSignature
        ) {
          stableStatePolls += 1
          if (stableStatePolls >= stablePolls) {
            return
          }
        } else {
          previousTabStateSignature =
            diagnostics.length === 0 ? tabStateSignature : ''
          stableStatePolls = 0
        }
        await delay(pollIntervalMs)
      }
      throw new Error(
        `Timed out waiting for complete expected tab states: ${JSON.stringify({
          stableStatePolls,
          previousTabStateSignature,
          lastDiagnostics,
        })}`,
      )
    },
    {
      blockedTitleSnippets: INTERSTITIAL_TITLE_SNIPPETS,
      canonicalSourceAliases: CANONICAL_SOURCE_ALIASES,
      expectedGroups,
      expectedTabs,
      expectedWindows,
      fallbackIconState: FALLBACK_TAB_ICON_STATE,
      maxAttempts: Math.ceil(UI_READY_TIMEOUT_MS / TAB_LOAD_POLL_INTERVAL_MS),
      pollIntervalMs: TAB_LOAD_POLL_INTERVAL_MS,
      requiredTitleRules: REQUIRED_TAB_TITLE_RULES,
      stablePolls: TAB_STATE_STABLE_POLLS,
    },
  )
}

async function waitForRenderedTabContent(page, browserState) {
  const { expectedGroups, expectedTabs, expectedWindows } = browserState
  await waitForExpectedTabStates(page, browserState)
  const unsettledTabIds = await page.evaluate(
    async ({
      blockedTitleSnippets,
      canonicalSourceAliases,
      expectedTabs,
      requiredTitleRules,
    }) => {
      const expectationsByTabId = new Map(
        expectedTabs.map((expectation) => [
          expectation.tabId,
          expectation.expectedUrl.toLowerCase(),
        ]),
      )
      const normalizedHost = (url) => {
        try {
          return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
        } catch {
          return ''
        }
      }
      const canonicalSourceUrl = (url) => {
        try {
          const parsedUrl = new URL(url)
          const protocol = parsedUrl.protocol.toLowerCase()
          const hostname = normalizedHost(url)
          const port = parsedUrl.port ? `:${parsedUrl.port}` : ''
          const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/'
          return `${protocol}//${hostname}${port}${pathname}`
        } catch {
          return ''
        }
      }
      const sourceMatchesExpected = (expectedUrl, actualUrl) => {
        const expectedSource = canonicalSourceUrl(expectedUrl)
        const actualSource = canonicalSourceUrl(actualUrl)
        const allowedSources = [
          expectedSource,
          ...(canonicalSourceAliases[expectedSource] || []),
        ].map(canonicalSourceUrl)
        return (
          expectedSource.length > 0 && allowedSources.includes(actualSource)
        )
      }
      const isGenericTitle = (title, url) => {
        const normalizedTitle = title
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/[/?#]+$/, '')
        const normalizedUrl = url
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/[/?#]+$/, '')
        return (
          normalizedTitle === normalizedHost(url) ||
          normalizedTitle === normalizedUrl ||
          title.startsWith('http://') ||
          title.startsWith('https://')
        )
      }
      const tabIds = Array.from(
        document.querySelectorAll('[data-testid^="tab-row-"]'),
      )
        .filter((tabRow) => {
          const rect = tabRow.getBoundingClientRect()
          return (
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth
          )
        })
        .map((tabRow) => Number(tabRow.getAttribute('data-testid')?.slice(8)))
        .filter(Number.isFinite)
      const tabs = await Promise.all(
        tabIds.map((tabId) => chrome.tabs.get(tabId).catch(() => undefined)),
      )
      return tabs
        .filter((tab) => {
          const title = String(tab?.title || '')
            .trim()
            .toLowerCase()
          const url = String(tab?.url || '')
            .trim()
            .toLowerCase()
          const expectedUrl = expectationsByTabId.get(tab?.id)
          const isControllerTab = url.startsWith(
            `${location.origin.toLowerCase()}/`,
          )
          const validationSourceUrl = expectedUrl || url
          const matchingTitleRule = requiredTitleRules.find((rule) =>
            validationSourceUrl.startsWith(rule.urlPrefix),
          )
          const titleRuleSatisfied = matchingTitleRule?.titleIncludes
            ? title.includes(matchingTitleRule.titleIncludes)
            : !isGenericTitle(title, url)
          const statusSettled =
            tab?.status === 'complete' ||
            (matchingTitleRule?.allowStableLoading && tab?.status === 'loading')
          return (
            !tab ||
            !title ||
            !titleRuleSatisfied ||
            !statusSettled ||
            (!expectedUrl && !isControllerTab) ||
            (!!expectedUrl && !sourceMatchesExpected(expectedUrl, url)) ||
            url.startsWith('chrome-error://') ||
            blockedTitleSnippets.some((snippet) => title.includes(snippet))
          )
        })
        .map((tab) => tab?.id)
        .filter(Number.isFinite)
    },
    {
      blockedTitleSnippets: INTERSTITIAL_TITLE_SNIPPETS,
      canonicalSourceAliases: CANONICAL_SOURCE_ALIASES,
      expectedTabs,
      requiredTitleRules: REQUIRED_TAB_TITLE_RULES,
    },
  )
  if (unsettledTabIds.length > 0) {
    await page.evaluate(
      async ({
        tabIds,
        pollIntervalMs,
        blockedTitleSnippets,
        canonicalSourceAliases,
        expectedGroups,
        expectedTabs,
        expectedWindows,
        requiredTitleRules,
      }) => {
        const delay = (ms) =>
          new Promise((resolve) => {
            setTimeout(resolve, ms)
          })
        const expectationsByTabId = new Map(
          expectedTabs.map((expectation) => [
            expectation.tabId,
            expectation.expectedUrl.toLowerCase(),
          ]),
        )
        const normalizedHost = (url) => {
          try {
            return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
          } catch {
            return ''
          }
        }
        const canonicalSourceUrl = (url) => {
          try {
            const parsedUrl = new URL(url)
            const protocol = parsedUrl.protocol.toLowerCase()
            const hostname = normalizedHost(url)
            const port = parsedUrl.port ? `:${parsedUrl.port}` : ''
            const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/'
            return `${protocol}//${hostname}${port}${pathname}`
          } catch {
            return ''
          }
        }
        const sourceMatchesExpected = (expectedUrl, actualUrl) => {
          const expectedSource = canonicalSourceUrl(expectedUrl)
          const actualSource = canonicalSourceUrl(actualUrl)
          const allowedSources = [
            expectedSource,
            ...(canonicalSourceAliases[expectedSource] || []),
          ].map(canonicalSourceUrl)
          return (
            expectedSource.length > 0 && allowedSources.includes(actualSource)
          )
        }
        const isGenericTitle = (title, url) => {
          const normalizedTitle = title
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/[/?#]+$/, '')
          const normalizedUrl = url
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/[/?#]+$/, '')
          return (
            normalizedTitle === normalizedHost(url) ||
            normalizedTitle === normalizedUrl ||
            title.startsWith('http://') ||
            title.startsWith('https://')
          )
        }
        const isSettledTab = (tab) => {
          const title = String(tab?.title || '')
            .trim()
            .toLowerCase()
          const url = String(tab?.url || '')
            .trim()
            .toLowerCase()
          const expectedUrl = expectationsByTabId.get(tab?.id)
          const isControllerTab = url.startsWith(
            `${location.origin.toLowerCase()}/`,
          )
          const validationSourceUrl = expectedUrl || url
          const matchingTitleRule = requiredTitleRules.find((rule) =>
            validationSourceUrl.startsWith(rule.urlPrefix),
          )
          const titleRuleSatisfied = matchingTitleRule?.titleIncludes
            ? title.includes(matchingTitleRule.titleIncludes)
            : !isGenericTitle(title, url)
          const statusSettled =
            tab?.status === 'complete' ||
            (matchingTitleRule?.allowStableLoading && tab?.status === 'loading')
          return (
            !!tab &&
            title.length > 0 &&
            titleRuleSatisfied &&
            statusSettled &&
            (isControllerTab ||
              (!!expectedUrl && sourceMatchesExpected(expectedUrl, url))) &&
            !url.startsWith('chrome-error://') &&
            !blockedTitleSnippets.some((snippet) => title.includes(snippet))
          )
        }
        try {
          for (const tabId of tabIds) {
            try {
              await chrome.tabs.update(tabId, { active: true })
              for (let attempt = 0; attempt < 40; attempt += 1) {
                const tab = await chrome.tabs.get(tabId)
                if (isSettledTab(tab)) {
                  break
                }
                await delay(pollIntervalMs)
              }
            } catch {
              // The final rendered-content assertion reports any unresolved row.
            }
          }
        } finally {
          for (const expectation of expectedWindows) {
            if (typeof expectation.activeTabId !== 'number') {
              throw new Error(
                `Missing expected active tab for window ${expectation.windowId}`,
              )
            }
            await chrome.tabs.update(expectation.activeTabId, { active: true })
          }
          for (const group of expectedGroups) {
            await chrome.tabGroups.update(group.groupId, {
              title: group.title,
              color: group.color,
              collapsed: group.collapsed,
            })
          }
        }
      },
      {
        tabIds: unsettledTabIds,
        pollIntervalMs: TAB_LOAD_POLL_INTERVAL_MS,
        blockedTitleSnippets: INTERSTITIAL_TITLE_SNIPPETS,
        canonicalSourceAliases: CANONICAL_SOURCE_ALIASES,
        expectedGroups,
        expectedTabs,
        expectedWindows,
        requiredTitleRules: REQUIRED_TAB_TITLE_RULES,
      },
    )
  }
  await page.evaluate(
    async ({ fallbackIconDataUrl, pollIntervalMs }) => {
      const delay = (ms) =>
        new Promise((resolve) => {
          setTimeout(resolve, ms)
        })
      const mountedTabIcons = () =>
        Array.from(document.querySelectorAll('[data-testid^="tab-row-"]'))
          .map((tabRow) => tabRow.querySelector('img'))
          .filter(Boolean)
      for (let attempt = 0; attempt < 40; attempt += 1) {
        if (mountedTabIcons().every((icon) => icon.complete)) {
          break
        }
        await delay(pollIntervalMs)
      }
      const icons = mountedTabIcons()
      for (const icon of icons) {
        const replaceWithFallback = async () => {
          icon.src = fallbackIconDataUrl
          icon.dataset.captureFallback = 'true'
          await icon.decode()
        }
        if (
          !icon.complete ||
          icon.naturalWidth <= 0 ||
          icon.src.endsWith('/empty.png')
        ) {
          await replaceWithFallback()
        } else {
          try {
            await icon.decode()
          } catch {
            await replaceWithFallback()
          }
        }
        if (!icon.complete || icon.naturalWidth <= 0) {
          throw new Error(
            `Mounted tab favicon did not decode: ${String(icon.src)}`,
          )
        }
      }
    },
    {
      fallbackIconDataUrl: FALLBACK_TAB_ICON_DATA_URL,
      pollIntervalMs: TAB_LOAD_POLL_INTERVAL_MS,
    },
  )
  await page.evaluate(
    async ({
      blockedTitleSnippets,
      canonicalSourceAliases,
      expectedTabs,
      requiredTitleRules,
      pollIntervalMs,
      stablePolls,
      maxAttempts,
    }) => {
      const delay = (ms) =>
        new Promise((resolve) => {
          setTimeout(resolve, ms)
        })
      const expectationsByTabId = new Map(
        expectedTabs.map((expectation) => [
          expectation.tabId,
          expectation.expectedUrl.toLowerCase(),
        ]),
      )
      const normalizedHost = (url) => {
        try {
          return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
        } catch {
          return ''
        }
      }
      const canonicalSourceUrl = (url) => {
        try {
          const parsedUrl = new URL(url)
          const protocol = parsedUrl.protocol.toLowerCase()
          const hostname = normalizedHost(url)
          const port = parsedUrl.port ? `:${parsedUrl.port}` : ''
          const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/'
          return `${protocol}//${hostname}${port}${pathname}`
        } catch {
          return ''
        }
      }
      const sourceMatchesExpected = (expectedUrl, actualUrl) => {
        const expectedSource = canonicalSourceUrl(expectedUrl)
        const actualSource = canonicalSourceUrl(actualUrl)
        const allowedSources = [
          expectedSource,
          ...(canonicalSourceAliases[expectedSource] || []),
        ].map(canonicalSourceUrl)
        return (
          expectedSource.length > 0 && allowedSources.includes(actualSource)
        )
      }
      const isGenericTitle = (title, url) => {
        const normalizedTitle = title
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/[/?#]+$/, '')
        const normalizedUrl = url
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/[/?#]+$/, '')
        return (
          normalizedTitle === normalizedHost(url) ||
          normalizedTitle === normalizedUrl ||
          title.startsWith('http://') ||
          title.startsWith('https://')
        )
      }
      let previousTabStateSignature = ''
      let stableStatePolls = 0
      let lastDiagnostics = []
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const tabRows = Array.from(
          document.querySelectorAll('[data-testid^="tab-row-"]'),
        ).filter((tabRow) => {
          const rect = tabRow.getBoundingClientRect()
          return (
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth
          )
        })
        const tabStates = []
        const diagnostics = []
        let allRowsSettled = tabRows.length > 0
        for (const tabRow of tabRows) {
          const rowText = String(tabRow.innerText || '')
            .trim()
            .toLowerCase()
          const tabId = Number(tabRow.getAttribute('data-testid')?.slice(8))
          const tab = Number.isFinite(tabId)
            ? await chrome.tabs.get(tabId).catch(() => undefined)
            : undefined
          const title = String(tab?.title || '')
            .trim()
            .toLowerCase()
          const url = String(tab?.url || '')
            .trim()
            .toLowerCase()
          const status = String(tab?.status || '')
            .trim()
            .toLowerCase()
          const expectedUrl = expectationsByTabId.get(tabId)
          const isControllerTab = url.startsWith(
            `${location.origin.toLowerCase()}/`,
          )
          const validationSourceUrl = expectedUrl || url
          const matchingTitleRule = requiredTitleRules.find((rule) =>
            validationSourceUrl.startsWith(rule.urlPrefix),
          )
          const statusSettled =
            status === 'complete' ||
            (matchingTitleRule?.allowStableLoading && status === 'loading')
          const icon = tabRow.querySelector('img')
          const iconSrc = String(icon?.currentSrc || icon?.src || '')
          const iconReady =
            !!icon &&
            icon.complete &&
            icon.naturalWidth > 0 &&
            iconSrc.length > 0 &&
            !iconSrc.endsWith('/empty.png')
          const titleRuleSatisfied = matchingTitleRule?.titleIncludes
            ? title.includes(matchingTitleRule.titleIncludes)
            : !isGenericTitle(title, url)
          if (
            !tab ||
            !title ||
            !rowText.includes(title) ||
            !statusSettled ||
            !titleRuleSatisfied ||
            (!expectedUrl && !isControllerTab) ||
            (!!expectedUrl && !sourceMatchesExpected(expectedUrl, url)) ||
            !iconReady ||
            url.startsWith('chrome-error://') ||
            blockedTitleSnippets.some((snippet) => title.includes(snippet))
          ) {
            diagnostics.push({
              tabId,
              status: tab?.status,
              title,
              url,
              expectedUrl: expectedUrl || '(unregistered)',
              rowText,
              requiredTitle: matchingTitleRule?.titleIncludes,
              allowStableLoading: matchingTitleRule?.allowStableLoading,
              iconComplete: icon?.complete,
              iconNaturalWidth: icon?.naturalWidth,
              iconSrc,
            })
            allRowsSettled = false
            break
          }
          tabStates.push(`${tabId}:${status}:${url}:${title}:${iconSrc}`)
        }
        const tabStateSignature = tabStates.join('|')
        lastDiagnostics = diagnostics
        if (allRowsSettled && tabStateSignature === previousTabStateSignature) {
          stableStatePolls += 1
          if (stableStatePolls >= stablePolls) {
            return
          }
        } else {
          previousTabStateSignature = allRowsSettled ? tabStateSignature : ''
          stableStatePolls = 0
        }
        await delay(pollIntervalMs)
      }
      throw new Error(
        `Timed out waiting for stable rendered tab states: ${JSON.stringify({
          stableStatePolls,
          previousTabStateSignature,
          lastDiagnostics,
        })}`,
      )
    },
    {
      blockedTitleSnippets: INTERSTITIAL_TITLE_SNIPPETS,
      canonicalSourceAliases: CANONICAL_SOURCE_ALIASES,
      expectedTabs,
      requiredTitleRules: REQUIRED_TAB_TITLE_RULES,
      pollIntervalMs: TAB_LOAD_POLL_INTERVAL_MS,
      stablePolls: TAB_STATE_STABLE_POLLS,
      maxAttempts: Math.ceil(UI_READY_TIMEOUT_MS / TAB_LOAD_POLL_INTERVAL_MS),
    },
  )
}

async function dismissHoverTooltips(page) {
  await page.mouse.move(1, 1, { steps: 2 })
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll('[role="tooltip"]')).every(
        (tooltip) => {
          const style = window.getComputedStyle(tooltip)
          return (
            tooltip.getClientRects().length === 0 ||
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0'
          )
        },
      ),
    undefined,
    { timeout: UI_READY_TIMEOUT_MS, polling: 100 },
  )
}

async function saveScreenshot(page, name, browserState) {
  const rawDir = join(tmpdir(), 'tmv2-release-raw')
  mkdirSync(rawDir, { recursive: true })
  const rawPath = join(rawDir, `${name}-raw.png`)
  const outputPath = pathForScreenshot(name)
  await page.bringToFront()
  await waitForRenderedTabContent(page, browserState)
  await dismissHoverTooltips(page)
  await waitForNoVisibleInterstitialText(page, name)
  await page.waitForTimeout(SCREENSHOT_SETTLE_DELAY_MS)
  await assertFinalCaptureState(page, name, browserState)
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

async function captureOverview(page, fullPageUrl, theme, controller) {
  await resetScenario(page, fullPageUrl, {
    ...theme.settings,
    tabWidth: 18,
  })
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
  const browserState = await expectedBrowserStateFor(
    page,
    controller,
    createdWindows,
  )
  console.log('    stabilizing overview browser state')
  await waitForExpectedTabStates(page, browserState)
  console.log('    reloading normalized overview popup')
  await reloadPopup(page)
  console.log('    scrolling overview target window into view')
  await scrollWindowIntoView(page, targetWindowId)
  await saveScreenshot(
    page,
    screenshotName('01-overview-groups', theme.name),
    browserState,
  )
}

async function captureGroupEditing(page, fullPageUrl, theme, controller) {
  await resetScenario(page, fullPageUrl, theme.settings)
  const windows = [
    {
      tabs: [
        realUrl('brand/jenny-home'),
        realUrl('brand/tab-manager'),
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
            realUrl('brand/tab-manager'),
            realUrl('brand/jenny-youtube'),
          ],
        },
      ],
    },
  ]
  const createdWindows = await createDemoWindows(page, windows)
  const [windowData] = createdWindows
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
  await saveScreenshot(
    page,
    screenshotName('02-group-editing', theme.name),
    await expectedBrowserStateFor(page, controller, createdWindows),
  )
}

async function captureSearchGroups(page, fullPageUrl, theme, controller) {
  await resetScenario(page, fullPageUrl, theme.settings)
  const windows = [
    {
      tabs: [
        realUrl('brand/jenny-home'),
        realUrl('brand/tab-manager'),
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
            realUrl('brand/tab-manager'),
            realUrl('brand/jenny-youtube'),
          ],
        },
      ],
    },
  ]
  const createdWindows = await createDemoWindows(page, windows)
  const [windowData] = createdWindows
  const groupId = windowData.groups[0].groupId
  await reloadPopup(page)
  await waitForScenarioReady(page, scenarioCounts(windows))
  await page.waitForSelector(`[data-testid="tab-group-header-${groupId}"]`)
  const searchInput = page.locator('input[placeholder*="Search tabs or URLs"]')
  await searchInput.fill('jenny')
  await page.waitForTimeout(250)
  await saveScreenshot(
    page,
    screenshotName('03-search-groups', theme.name),
    await expectedBrowserStateFor(page, controller, createdWindows),
  )
}

async function captureDuplicateCleanup(page, fullPageUrl, theme, controller) {
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
        realUrl('brand/tab-manager'),
        realUrl('brand/tab-manager'),
        realUrl('support/customer-4821'),
        realUrl('support/customer-5104'),
      ],
      groups: [
        {
          title: 'Cleanup Queue',
          color: 'green',
          urls: [
            realUrl('brand/jenny-home'),
            realUrl('brand/tab-manager'),
            realUrl('support/customer-4821'),
          ],
        },
      ],
    },
  ]
  console.log('    creating duplicate cleanup demo windows')
  const createdWindows = await createDemoWindows(page, windows)
  console.log('    reloading duplicate cleanup popup')
  await reloadPopup(page)
  console.log('    waiting for duplicate cleanup scenario counts')
  await waitForScenarioReady(page, scenarioCounts(windows))
  await page.waitForSelector(
    'button[aria-label^="Clean "][aria-label*="duplicate"]',
  )
  await saveScreenshot(
    page,
    screenshotName('04-duplicate-cleanup', theme.name),
    await expectedBrowserStateFor(page, controller, createdWindows),
  )
}

async function captureKeyboardShortcuts(page, fullPageUrl, theme, controller) {
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
  const createdWindows = await createDemoWindows(page, windows)
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
    await expectedBrowserStateFor(page, controller, createdWindows),
  )
}

async function captureGroupedTabsFocus(page, fullPageUrl, theme, controller) {
  await resetScenario(page, fullPageUrl, {
    ...theme.settings,
    tabWidth: GROUPED_FOCUS_TAB_WIDTH,
  })
  console.log('    creating grouped focus demo windows')
  const createdWindows = await createDemoWindows(page, DENSE_OVERVIEW_WINDOWS)
  console.log('    focusing grouped focus target window')
  const targetWindowId = await focusDemoWindow(
    page,
    createdWindows,
    GROUPED_FOCUS_WINDOW_INDEX,
    GROUPED_FOCUS_TAB_INDEX,
  )
  console.log('    reloading grouped focus popup')
  await reloadPopup(page)
  console.log('    waiting for grouped focus scenario counts')
  await waitForScenarioReady(page, scenarioCounts(DENSE_OVERVIEW_WINDOWS))
  const browserState = await expectedBrowserStateFor(
    page,
    controller,
    createdWindows,
  )
  console.log('    stabilizing grouped focus browser state')
  await waitForExpectedTabStates(page, browserState)
  console.log('    reloading normalized grouped focus popup')
  await reloadPopup(page)
  console.log('    scrolling grouped focus target window into view')
  await scrollWindowIntoView(page, targetWindowId)
  const targetGroup =
    createdWindows[GROUPED_FOCUS_WINDOW_INDEX].groups[GROUPED_FOCUS_GROUP_INDEX]
  console.log(`    selecting focused group ${targetGroup.title}`)
  await page.getByTestId(`tab-group-toggle-${targetGroup.groupId}`).focus()
  await page.keyboard.press('x')
  await page.getByText('4 tabs selected', { exact: false }).waitFor()
  await saveScreenshot(
    page,
    screenshotName('06-grouped-tabs-focus', theme.name),
    browserState,
  )
}

async function captureSettings(page, fullPageUrl, theme, controller) {
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
  const createdWindows = await createDemoWindows(page, windows)
  await reloadPopup(page)
  await waitForScenarioReady(page, scenarioCounts(windows))
  await page.locator('button[aria-label="Settings"]').first().click()
  await page.getByTestId('settings-panel-theme-density').waitFor()
  await saveScreenshot(
    page,
    screenshotName('07-settings', theme.name),
    await expectedBrowserStateFor(page, controller, createdWindows),
  )
}

async function captureCommandPalette(page, fullPageUrl, theme, controller) {
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
  const createdWindows = await createDemoWindows(page, windows)
  await reloadPopup(page)
  await waitForScenarioReady(page, scenarioCounts(windows))
  const searchInput = page.locator('input[placeholder*="Search tabs or URLs"]')
  await searchInput.fill('>sort')
  await page.waitForSelector('[role="option"]')
  await saveScreenshot(
    page,
    screenshotName('08-command-palette', theme.name),
    await expectedBrowserStateFor(page, controller, createdWindows),
  )
}

async function main() {
  ensureBuildExists()
  ensureMagickExists()

  const availableScenarioSteps = [
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
  ]
  const availableScenarioNames = new Set(
    availableScenarioSteps.map((scenario) => scenario.id),
  )
  const availableThemeNames = new Set(THEME_VARIANTS.map((theme) => theme.name))
  const unknownScenarios = [...REQUESTED_SCENARIOS].filter(
    (name) => !availableScenarioNames.has(name),
  )
  const unknownThemes = REQUESTED_THEMES.filter(
    (name) => !availableThemeNames.has(name),
  )
  if (unknownThemes.length > 0 || unknownScenarios.length > 0) {
    throw new Error(
      `Unknown release screenshot filter: ${JSON.stringify({
        unknownThemes,
        unknownScenarios,
        availableThemes: [...availableThemeNames],
        availableScenarios: [...availableScenarioNames],
      })}`,
    )
  }

  const scenarioSteps = availableScenarioSteps.filter(
    (scenario) =>
      REQUESTED_SCENARIOS.size === 0 || REQUESTED_SCENARIOS.has(scenario.id),
  )
  const themeVariants = THEME_VARIANTS.filter(
    (theme) =>
      REQUESTED_THEMES.length === 0 || REQUESTED_THEMES.includes(theme.name),
  )
  if (themeVariants.length === 0 || scenarioSteps.length === 0) {
    throw new Error(
      `Release screenshot filters resolved to an empty selection: ${JSON.stringify(
        {
          themes: themeVariants.map((theme) => theme.name),
          scenarios: scenarioSteps.map((scenario) => scenario.id),
        },
      )}`,
    )
  }

  if (REQUESTED_THEMES.length === 0 && REQUESTED_SCENARIOS.size === 0) {
    rmSync(PNG_OUTPUT_DIR, { recursive: true, force: true })
  }
  mkdirSync(OUTPUT_ROOT_DIR, { recursive: true })

  let context = null
  let userDataDir = null
  try {
    const init = await initExtensionPage()
    context = init.context
    userDataDir = init.userDataDir
    const { controller, page, fullPageUrl } = init

    for (const theme of themeVariants) {
      console.log(`Capturing ${theme.name} theme`)
      for (const scenario of scenarioSteps) {
        console.log(`  ${scenario.label}`)
        await scenario.run(page, fullPageUrl, theme, controller)
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
