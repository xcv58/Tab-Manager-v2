#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const VIEWPORT = { width: 1280, height: 800 }
const ROOT_DIR = join(fileURLToPath(new URL('../../..', import.meta.url)))
const OUTPUT_ROOT_DIR = join(ROOT_DIR, 'docs/assets/images/release-candidates')
const PNG_OUTPUT_DIR = join(OUTPUT_ROOT_DIR, 'png')
const EXTENSION_PATH = join(ROOT_DIR, 'packages/extension/build/build_chrome')

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

const REAL_URLS = {
  'launch/release-roadmap': 'https://jenny.media/',
  'launch/store-copy': 'https://chatgpt.com/',
  'launch/final-checklist': 'https://claude.ai/login',
  'launch/support-plan': 'https://gemini.google.com/',
  'launch/qa-signoff': 'https://github.com/xcv58/Tab-Manager-v2',
  'launch/rollout-plan': 'https://tab.jenny.media/',
  'research/tab-groups-api':
    'https://developer.chrome.com/docs/extensions/reference/api/tabGroups',
  'research/firefox-parity':
    'https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups',
  'research/edge-review': 'https://www.reddit.com/',
  'research/keyboard-flows': 'https://github.com/trending',
  'research/ux-followups': 'https://www.youtube.com/@JennyTV1',
  'research/screenshot-brief': 'https://news.ycombinator.com/',
  'reading/design-refresh': 'https://www.nytimes.com/',
  'reading/accessibility-audit': 'https://www.bbc.com/news',
  'reading/performance-review': 'https://www.theverge.com/',
  'reading/changelog-draft': 'https://www.cnn.com/',
  'support/customer-4821': 'https://www.reuters.com/',
  'support/customer-5104': 'https://www.npr.org/',
  'support/release-mail': 'https://www.reddit.com/r/chrome_extensions/',
  'support/docs-ticket':
    'https://stackoverflow.com/questions/tagged/google-chrome-extension',
  'ops/duplicate-tabs': 'https://jenny.media/',
  'ops/window-groups': 'https://chatgpt.com/',
}

const OVERVIEW_WINDOWS = [
  {
    tabs: [
      'launch/release-roadmap',
      'launch/store-copy',
      'launch/final-checklist',
      'launch/support-plan',
      'reading/design-refresh',
      'reading/accessibility-audit',
      'reading/changelog-draft',
      'support/customer-4821',
    ],
    groups: [
      {
        title: 'AI Tools',
        color: 'blue',
        urls: [
          'launch/release-roadmap',
          'launch/store-copy',
          'launch/final-checklist',
          'launch/support-plan',
        ],
      },
      {
        title: 'Newsroom',
        color: 'red',
        urls: [
          'reading/design-refresh',
          'reading/accessibility-audit',
          'reading/changelog-draft',
          'support/customer-4821',
        ],
      },
    ],
  },
  {
    tabs: [
      'research/tab-groups-api',
      'research/firefox-parity',
      'launch/rollout-plan',
      'reading/performance-review',
      'launch/qa-signoff',
      'research/edge-review',
      'support/release-mail',
      'research/keyboard-flows',
      'research/ux-followups',
    ],
    groups: [
      {
        title: 'Docs',
        color: 'green',
        urls: [
          'research/tab-groups-api',
          'research/firefox-parity',
          'launch/qa-signoff',
        ],
      },
      {
        title: 'Community',
        color: 'yellow',
        urls: [
          'research/edge-review',
          'support/release-mail',
          'research/keyboard-flows',
          'research/ux-followups',
        ],
      },
    ],
  },
]

const GROUPED_TABS_FOCUS_WINDOWS = [
  {
    tabs: [
      'launch/release-roadmap',
      'launch/store-copy',
      'launch/final-checklist',
      'launch/rollout-plan',
      'launch/support-plan',
      'reading/design-refresh',
      'reading/accessibility-audit',
      'support/customer-4821',
    ],
    groups: [
      {
        title: 'AI Tools',
        color: 'blue',
        urls: [
          'launch/release-roadmap',
          'launch/store-copy',
          'launch/final-checklist',
          'launch/rollout-plan',
          'launch/support-plan',
        ],
      },
      {
        title: 'News',
        color: 'green',
        urls: [
          'reading/design-refresh',
          'reading/accessibility-audit',
          'support/customer-4821',
        ],
      },
    ],
  },
]

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
    timeout: 45000,
  })
  await page.waitForTimeout(400)
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
  await page.goto(fullPageUrl, { waitUntil: 'domcontentloaded' })
  await waitForUi(page)
}

async function reloadPopup(page) {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitForUi(page)
}

async function createDemoWindows(page, windows) {
  return page.evaluate(async (definitions) => {
    const waitForTabCount = async (windowId, expectedCount) => {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const tabs = await chrome.tabs.query({ windowId })
        if (
          tabs.length >= expectedCount &&
          tabs.every((tab) => tab.status === 'complete')
        ) {
          return tabs.slice().sort((a, b) => a.index - b.index)
        }
        await new Promise((resolve) => setTimeout(resolve, 80))
      }
      return (await chrome.tabs.query({ windowId }))
        .slice()
        .sort((a, b) => a.index - b.index)
    }

    const createWindowWithTabs = async (urls) => {
      const [firstUrl, ...restUrls] = urls
      const created = await chrome.windows.create({
        url: firstUrl,
        focused: false,
      })
      const windowId = created.id
      if (typeof windowId !== 'number') {
        throw new Error('Failed to create demo window')
      }
      for (const url of restUrls) {
        await chrome.tabs.create({
          windowId,
          url,
          active: false,
        })
      }
      const tabs = await waitForTabCount(windowId, urls.length)
      return {
        windowId,
        tabIds: tabs.map((tab) => tab.id),
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

    const created = []
    for (const definition of definitions) {
      const urls = definition.tabs
      const { windowId, tabIds } = await createWindowWithTabs(urls)
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
      created.push({ windowId, groups })
    }
    return created
  }, windows)
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

async function saveScreenshot(page, name) {
  const rawDir = join(tmpdir(), 'tmv2-release-raw')
  mkdirSync(rawDir, { recursive: true })
  const rawPath = join(rawDir, `${name}-raw.png`)
  const outputPath = pathForScreenshot(name)
  await page.bringToFront()
  await page.waitForTimeout(300)
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
  await createDemoWindows(page, resolveWindows(OVERVIEW_WINDOWS))
  await reloadPopup(page)
  await saveScreenshot(page, screenshotName('01-overview-groups', theme.name))
}

async function captureGroupEditing(page, fullPageUrl, theme) {
  await resetScenario(page, fullPageUrl, theme.settings)
  const [windowData] = await createDemoWindows(page, [
    {
      tabs: [
        realUrl('launch/release-roadmap'),
        realUrl('launch/store-copy'),
        realUrl('launch/final-checklist'),
        realUrl('launch/support-plan'),
        realUrl('launch/rollout-plan'),
        realUrl('research/tab-groups-api'),
      ],
      groups: [
        {
          title: 'AI Tools',
          color: 'green',
          urls: [
            realUrl('launch/release-roadmap'),
            realUrl('launch/store-copy'),
            realUrl('launch/final-checklist'),
          ],
        },
      ],
    },
  ])
  const groupId = windowData.groups[0].groupId
  await reloadPopup(page)
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
  const [windowData] = await createDemoWindows(page, [
    {
      tabs: [
        realUrl('launch/release-roadmap'),
        realUrl('launch/store-copy'),
        realUrl('launch/final-checklist'),
        realUrl('launch/support-plan'),
        realUrl('launch/rollout-plan'),
        realUrl('research/tab-groups-api'),
      ],
      groups: [
        {
          title: 'AI Tools',
          color: 'blue',
          collapsed: true,
          urls: [
            realUrl('launch/release-roadmap'),
            realUrl('launch/store-copy'),
            realUrl('launch/rollout-plan'),
          ],
        },
      ],
    },
  ])
  const groupId = windowData.groups[0].groupId
  await reloadPopup(page)
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
  await createDemoWindows(page, [
    {
      tabs: [
        realUrl('ops/duplicate-tabs'),
        realUrl('ops/duplicate-tabs'),
        realUrl('ops/window-groups'),
        realUrl('launch/final-checklist'),
        realUrl('support/release-mail'),
      ],
      groups: [
        {
          title: 'Operations',
          color: 'orange',
          urls: [realUrl('ops/duplicate-tabs'), realUrl('ops/window-groups')],
        },
      ],
    },
  ])
  await reloadPopup(page)
  await page.waitForSelector(
    'button[aria-label^="Clean "][aria-label*="duplicate"]',
  )
  await saveScreenshot(page, screenshotName('04-duplicate-cleanup', theme.name))
}

async function captureKeyboardShortcuts(page, fullPageUrl, theme) {
  await resetScenario(page, fullPageUrl, theme.settings)
  await createDemoWindows(page, [
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
  ])
  await reloadPopup(page)
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
  await createDemoWindows(page, resolveWindows(GROUPED_TABS_FOCUS_WINDOWS))
  await reloadPopup(page)
  await saveScreenshot(
    page,
    screenshotName('06-grouped-tabs-focus', theme.name),
  )
}

async function captureSettings(page, fullPageUrl, theme) {
  await resetScenario(page, fullPageUrl, theme.settings)
  await createDemoWindows(page, [
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
  ])
  await reloadPopup(page)
  await page.locator('button[aria-label="Settings"]').first().click()
  await page.getByText('Theme & density').waitFor()
  await saveScreenshot(page, screenshotName('07-settings', theme.name))
}

async function captureCommandPalette(page, fullPageUrl, theme) {
  await resetScenario(page, fullPageUrl, theme.settings)
  await createDemoWindows(page, [
    {
      tabs: [
        realUrl('launch/release-roadmap'),
        realUrl('launch/store-copy'),
        realUrl('reading/accessibility-audit'),
        realUrl('reading/changelog-draft'),
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
  ])
  await reloadPopup(page)
  const searchInput = page.locator('input[placeholder*="Search tabs or URLs"]')
  await searchInput.fill('>sort')
  await page.waitForSelector('.MuiAutocomplete-option')
  await saveScreenshot(page, screenshotName('08-command-palette', theme.name))
}

async function main() {
  ensureBuildExists()
  ensureMagickExists()
  rmSync(PNG_OUTPUT_DIR, { recursive: true, force: true })
  mkdirSync(OUTPUT_ROOT_DIR, { recursive: true })

  let context = null
  let userDataDir = null
  try {
    const init = await initExtensionPage()
    context = init.context
    userDataDir = init.userDataDir
    const { page, fullPageUrl } = init

    for (const theme of THEME_VARIANTS) {
      console.log(`Capturing ${theme.name} theme`)
      await captureOverview(page, fullPageUrl, theme)
      await captureGroupEditing(page, fullPageUrl, theme)
      await captureSearchGroups(page, fullPageUrl, theme)
      await captureDuplicateCleanup(page, fullPageUrl, theme)
      await captureKeyboardShortcuts(page, fullPageUrl, theme)
      await captureGroupedTabsFocus(page, fullPageUrl, theme)
      await captureSettings(page, fullPageUrl, theme)
      await captureCommandPalette(page, fullPageUrl, theme)
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
