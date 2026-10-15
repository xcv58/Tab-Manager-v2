#!/usr/bin/env node
/* global chrome, document, HTMLInputElement, Event, setTimeout, console, URL, fetch, innerWidth, innerHeight, outerWidth, outerHeight, getComputedStyle */
// Captures the actual built extension in an isolated profile. No store writes.
import { chromium } from 'playwright'
import { execFileSync, spawn } from 'node:child_process'
import { createServer } from 'node:http'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const root = fileURLToPath(new URL('../../..', import.meta.url))
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim()
const kind = process.env.STORE_SCREENSHOT_BROWSER || 'chrome'
if (!['chrome', 'firefox', 'edge'].includes(kind))
  throw new Error('Unknown browser')
const output = resolve(
  process.env.STORE_SCREENSHOT_OUTPUT ||
    join(root, '.tmp/store-listing-refresh'),
)
const destination = join(output, 'captures', kind)
mkdirSync(destination, { recursive: true })
const profile = mkdtempSync(join(tmpdir(), 'tmv2-store-review-'))
const candidateVersion = process.env.STORE_SCREENSHOT_VERSION
if (candidateVersion && !/^\d+\.\d+\.\d+$/.test(candidateVersion))
  throw new Error('Invalid candidate version')
const builtExtension = join(
  root,
  'packages/extension/build',
  kind === 'firefox' ? 'build_firefox' : 'build_chrome',
)
const extension = candidateVersion
  ? join(profile, 'candidate-extension')
  : builtExtension
if (candidateVersion) {
  cpSync(builtExtension, extension, { recursive: true })
  const manifest = JSON.parse(readFileSync(join(extension, 'manifest.json')))
  manifest.version = candidateVersion
  writeFileSync(join(extension, 'manifest.json'), JSON.stringify(manifest))
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const viewport = { width: 1280, height: 800 }
let cleanup = async () => {}

async function chromiumRuntime() {
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.STORE_SCREENSHOT_BROWSER_PATH || undefined,
    headless: false,
    viewport,
    screen: viewport,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-dev-shm-usage',
    ],
  })
  cleanup = () => context.close()
  let worker = context
    .serviceWorkers()
    .find((worker) => worker.url().startsWith('chrome-extension://'))
  if (!worker)
    worker = await context.waitForEvent('serviceworker', { timeout: 30000 })
  const id = new URL(worker.url()).host
  const page = context.pages()[0]
  const url = `chrome-extension://${id}/popup.html?not_popup=1`
  await page.goto(url)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setScrollbarsHidden', { hidden: true })
  return {
    run: (fn, arg) => page.evaluate(fn, arg),
    reload: () => page.reload(),
    screenshot: (path) => page.screenshot({ path, animations: 'disabled' }),
    park: () => page.mouse.move(1279, 1),
    front: () => page.bringToFront(),
    version: context.browser()?.version() || 'Chromium',
    url,
  }
}

async function firefoxRuntime() {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  const uuid = '12db2ab8-57bd-498f-a35c-cb3ac490a299'
  const addonId = JSON.parse(readFileSync(join(extension, 'manifest.json')))
    .browser_specific_settings.gecko.id
  const prefs = {
    'marionette.port': port + 1,
    'extensions.webextensions.uuids': JSON.stringify({ [addonId]: uuid }),
    'browser.shell.checkDefaultBrowser': false,
    'browser.startup.homepage_override.mstone': 'ignore',
    'browser.sessionstore.resume_from_crash': false,
    'layout.css.devPixelsPerPx': '1.0',
  }
  writeFileSync(
    join(profile, 'user.js'),
    Object.entries(prefs)
      .map(
        ([key, value]) =>
          `user_pref(${JSON.stringify(key)},${JSON.stringify(value)});`,
      )
      .join('\n'),
  )
  const binary =
    process.env.STORE_FIREFOX_BINARY ||
    '/Applications/Firefox.app/Contents/MacOS/firefox'
  execFileSync('open', [
    '-n',
    '/Applications/Firefox.app',
    '--args',
    '-headless',
    '-no-remote',
    '-marionette',
    '-profile',
    profile,
    '--remote-allow-system-access',
    'about:blank',
  ])
  const driver = spawn(
    process.env.STORE_GECKODRIVER || 'geckodriver',
    [
      '--port',
      String(port),
      '--connect-existing',
      '--marionette-port',
      String(port + 1),
    ],
    { stdio: 'ignore' },
  )
  const request = async (route, data, method = 'POST') => {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      method,
      ...(data === undefined
        ? {}
        : {
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
          }),
    })
    const result = (await response.json()).value
    if (!response.ok) throw new Error(JSON.stringify(result))
    return result
  }
  let pid
  cleanup = async () => {
    driver.kill()
    if (pid) {
      try {
        process.kill(pid, 'SIGTERM')
      } catch {
        /* The temporary browser may have already exited. */
      }
    }
  }
  for (let i = 0; i < 150; i++) {
    try {
      await request('/status', undefined, 'GET')
      break
    } catch {
      await sleep(100)
    }
  }
  let session
  for (let i = 0; i < 40; i++) {
    try {
      session = await request('/session', {
        capabilities: {
          alwaysMatch: {
            browserName: 'firefox',
            'moz:firefoxOptions': { binary },
          },
        },
      })
      break
    } catch (error) {
      if (i === 39) throw error
      await sleep(500)
    }
  }
  pid = session.capabilities['moz:processID']
  const route = `/session/${session.sessionId}`
  cleanup = async () => {
    try {
      await request(route, undefined, 'DELETE')
    } catch {
      /* The temporary session may have already closed. */
    }
    driver.kill()
    if (pid) {
      try {
        process.kill(pid, 'SIGTERM')
      } catch {
        /* The temporary browser may have already exited. */
      }
    }
  }
  await request(route + '/timeouts', { script: 180000, pageLoad: 120000 })
  const addon = join(profile, 'current-build.zip')
  execFileSync('zip', ['-q', '-r', addon, '.'], { cwd: extension })
  await request(route + '/moz/addon/install', { path: addon, temporary: true })
  await request(route + '/window/rect', { width: 1280, height: 900 })
  const url = `moz-extension://${uuid}/popup.html?not_popup=1`
  await request(route + '/url', { url })
  const run = async (fn, arg) => {
    const result = await request(route + '/execute/async', {
      script: `const done=arguments[arguments.length-1]; Promise.resolve((${fn.toString()})(arguments[0])).then(value=>done({value}),error=>done({error:String(error),stack:error.stack}));`,
      args: [arg ?? null],
    })
    if (result.error) throw new Error(result.error + '\n' + result.stack)
    return result.value
  }
  // Match the content viewport, not Firefox's outer window dimensions.
  for (let i = 0; i < 3; i++) {
    const size = await run(() => ({
      width: innerWidth,
      height: innerHeight,
      outerWidth,
      outerHeight,
    }))
    await request(route + '/window/rect', {
      width: size.outerWidth + 1280 - size.width,
      height: size.outerHeight + 800 - size.height,
    })
  }
  return {
    run,
    url,
    version: session.capabilities.browserVersion,
    reload: () => request(route + '/refresh', {}),
    screenshot: async (path) =>
      writeFileSync(
        path,
        Buffer.from(
          await request(route + '/screenshot', undefined, 'GET'),
          'base64',
        ),
      ),
    park: () =>
      request(route + '/actions', {
        actions: [
          {
            type: 'pointer',
            id: 'mouse',
            parameters: { pointerType: 'mouse' },
            actions: [
              {
                type: 'pointerMove',
                duration: 0,
                x: 1279,
                y: 1,
                origin: 'viewport',
              },
            ],
          },
        ],
      }),
    front: async () => {},
  }
}

// Real public pages; titles and favicons are read from the browser, never invented.
const definitions = [
  {
    groups: [
      {
        title: 'Work',
        color: 'blue',
        urls: [
          'https://tab.jenny.media/',
          'https://github.com/',
          'https://developer.mozilla.org/',
        ],
      },
      {
        title: 'AI tools',
        color: 'purple',
        urls: [
          'https://chatgpt.com/',
          'https://huggingface.co/',
          'https://gemini.google.com/',
        ],
      },
    ],
  },
  {
    groups: [
      {
        title: 'Reading',
        color: 'green',
        urls: [
          'https://www.wikipedia.org/',
          'https://news.ycombinator.com/',
          'https://jenny.media/',
        ],
      },
      {
        title: 'Watch later',
        color: 'orange',
        urls: [
          'https://www.youtube.com/@JennyTV1',
          'https://www.youtube.com/',
          'https://www.bbc.com/',
        ],
      },
    ],
  },
  {
    groups: [
      {
        title: 'Research',
        color: 'cyan',
        urls: [
          'https://react.dev/',
          'https://web.dev/',
          'https://developer.chrome.com/',
        ],
      },
      {
        title: 'Extra copies',
        color: 'red',
        urls: [
          'https://github.com/',
          'https://jenny.media/',
          'https://tab.jenny.media/',
        ],
      },
    ],
  },
]

const scenes = [
  {
    id: '01-find-any-tab',
    title: 'Find any tab, in any window',
    caption:
      'Search by title or URL across your windows, including tabs inside collapsed groups.',
  },
  {
    id: '02-organize-groups',
    title: 'Keep related pages together',
    caption: 'Name and color your browser tab groups, then move tabs together.',
  },
  {
    id: '03-clear-extra-copies',
    title: 'Clear out extra copies',
    caption: 'Find duplicate tabs and close the extra copies from one place.',
  },
  {
    id: '04-command-palette',
    title: 'Type what you want to do',
    caption:
      'Open the command palette inside Tab Manager to find actions for your selected tabs.',
  },
  {
    id: '05-save-tab-list',
    title: 'Copy links or save a tab list',
    caption:
      'Save selected tabs as CSV, TSV, JSON, or Markdown. Your selection stays ready for another format.',
  },
  {
    id: '06-make-it-comfortable',
    title: 'Make it comfortable',
    caption:
      'Search Settings and preview changes to your tab display before returning to your workspace.',
  },
]

async function main() {
  const runtime =
    kind === 'firefox' ? await firefoxRuntime() : await chromiumRuntime()
  const waitFor = async (fn, argument, timeout = 30000) => {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      if (await runtime.run(fn, argument)) return
      await sleep(200)
    }
    throw new Error(`Timed out: ${fn.toString().slice(0, 200)}`)
  }
  const click = async (selector, text) => {
    await waitFor(
      ({ selector, text }) =>
        Array.from(document.querySelectorAll(selector)).some(
          (node) =>
            (!text || node.textContent.includes(text)) &&
            node.getClientRects().length,
        ),
      { selector, text },
    )
    await runtime.run(
      ({ selector, text }) => {
        const node = Array.from(document.querySelectorAll(selector)).find(
          (node) =>
            (!text || node.textContent.includes(text)) &&
            node.getClientRects().length,
        )
        node.click()
      },
      { selector, text },
    )
  }
  const fill = async (selector, value) => {
    await waitFor((selector) => !!document.querySelector(selector), selector)
    return runtime.run(
      ({ selector, value }) => {
        const node = document.querySelector(selector)
        if (!node) throw new Error('Missing input: ' + selector)
        node.focus()
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        ).set.call(node, value)
        node.dispatchEvent(new Event('input', { bubbles: true }))
      },
      { selector, value },
    )
  }
  const palette = async () => {
    await fill('input[placeholder="Search tabs or URLs"]', '>')
    await waitFor(
      () => !!document.querySelector('[data-testid="command-palette"]'),
    )
  }
  await waitFor(
    () => !!document.querySelector('input[placeholder="Search tabs or URLs"]'),
  )
  const fixture = await runtime.run(async (definitions) => {
    const api = typeof browser === 'object' ? browser : chrome
    const controller = await api.tabs.getCurrent()
    const current = await api.windows.getCurrent({ populate: true })
    const otherTabs = (await api.tabs.query({})).filter(
      (tab) => tab.id !== controller.id,
    )
    if (otherTabs.length) await api.tabs.remove(otherTabs.map((tab) => tab.id))
    const result = []
    for (let index = 0; index < definitions.length; index++) {
      const definition = definitions[index]
      const urls = definition.groups.flatMap((group) => group.urls)
      let windowId = current.id
      const tabIds = []
      if (index === 0) {
        for (const url of urls)
          tabIds.push(
            (await api.tabs.create({ windowId, url, active: false })).id,
          )
      } else {
        const win = await api.windows.create({ url: urls[0], focused: false })
        windowId = win.id
        tabIds.push(win.tabs[0].id)
        for (const url of urls.slice(1))
          tabIds.push(
            (await api.tabs.create({ windowId, url, active: false })).id,
          )
      }
      const groups = []
      let offset = 0
      for (const group of definition.groups) {
        const ids = tabIds.slice(offset, offset + group.urls.length)
        const groupId = await api.tabs.group({
          tabIds: ids,
          createProperties: { windowId },
        })
        await api.tabGroups.update(groupId, {
          title: group.title,
          color: group.color,
          collapsed: false,
        })
        groups.push({ id: groupId, tabIds: ids, title: group.title })
        offset += group.urls.length
      }
      result.push({ windowId, tabIds, groups, urls })
    }
    await api.tabs.move(controller.id, { windowId: current.id, index: -1 })
    await api.tabs.ungroup(controller.id)
    await api.tabs.update(controller.id, { active: true })
    return { windows: result, controllerId: controller.id }
  }, definitions)
  console.log(`${kind} ${runtime.version}: created 3 windows and 19 tabs`)
  await waitFor(
    async (ids) => {
      const api = typeof browser === 'object' ? browser : chrome
      const tabs = await Promise.all(ids.map((id) => api.tabs.get(id)))
      return tabs.every(
        (tab) =>
          /^https:/.test(tab.url || '') &&
          !!tab.title?.trim() &&
          tab.status === 'complete',
      )
    },
    fixture.windows.flatMap((win) => win.tabIds),
    120000,
  )
  const sourceTabs = await runtime.run(async () => {
    const api = typeof browser === 'object' ? browser : chrome
    return (await api.tabs.query({})).map(
      ({ id, windowId, title, url, favIconUrl, status }) => ({
        id,
        windowId,
        title,
        url,
        favIconUrl,
        status,
      }),
    )
  })
  writeFileSync(
    join(destination, 'source-tabs.json'),
    JSON.stringify(sourceTabs, null, 2),
  )
  const blocked = sourceTabs.filter((tab) =>
    /just a moment|access denied|internal server error|captcha|page not found|security check/i.test(
      tab.title,
    ),
  )
  if (blocked.length)
    throw new Error('Blocked source pages: ' + JSON.stringify(blocked))
  const requestedScenes = process.env.STORE_SCREENSHOT_SCENES?.split(',')
  const records =
    (requestedScenes || process.env.STORE_SCREENSHOT_THEMES) &&
    existsSync(join(destination, 'captures.json'))
      ? JSON.parse(readFileSync(join(destination, 'captures.json')))
      : []
  const themes = process.env.STORE_SCREENSHOT_THEMES?.split(',') || [
    'light',
    'dark',
  ]
  for (const theme of themes) {
    for (const scene of scenes.filter(
      (scene) => !requestedScenes || requestedScenes.includes(scene.id),
    )) {
      await runtime.run(
        async ({ darkTheme }) => {
          const api = typeof browser === 'object' ? browser : chrome
          const settings = {
            useSystemTheme: false,
            darkTheme,
            uiPreset: 'modern',
            fontSize: 18,
            tabWidth: 22,
            autoFitColumns: true,
            litePopupMode: false,
            showUrl: true,
            showTabIcon: true,
            showTabTooltip: true,
            highlightDuplicatedTab: true,
            toolbarAutoHide: false,
            searchHistory: false,
            preserveSearch: false,
            autoFocusSearch: false,
            showShortcutHint: true,
            showUnmatchedTab: true,
            showSearchResultMenu: false,
          }
          await api.storage.local.clear()
          await api.storage.sync.clear()
          await api.storage.local.set(settings)
          await api.storage.sync.set(settings)
        },
        { darkTheme: theme === 'dark' },
      )
      await runtime.reload()
      await waitFor(
        () =>
          document.querySelectorAll('[data-testid^="tab-row-"]').length >= 19,
      )
      await sleep(1200)
      if (scene.id === '01-find-any-tab') {
        if (kind === 'chrome') {
          await runtime.park()
          await sleep(600)
          const raw = join(profile, 'overview.png')
          await runtime.screenshot(raw)
          const filename = `00-workspace-overview-${theme}.png`
          const path = join(destination, filename)
          execFileSync('magick', [
            raw,
            '-alpha',
            'remove',
            '-alpha',
            'off',
            '-strip',
            '-define',
            'png:color-type=2',
            path,
          ])
          writeFileSync(
            join(destination, `overview-${theme}.json`),
            JSON.stringify(
              {
                file: filename,
                sha256: createHash('sha256')
                  .update(readFileSync(path))
                  .digest('hex'),
                browser: kind,
                browserVersion: runtime.version,
                extensionVersion: candidateVersion,
                viewport,
              },
              null,
              2,
            ),
          )
        }
        await fill('input[placeholder="Search tabs or URLs"]', 'jenny')
      } else if (scene.id === '02-organize-groups') {
        const id = fixture.windows[0].groups[0].id
        await click(`[data-testid="tab-group-menu-${id}"]`)
        await click(`[data-testid="tab-group-menu-rename-${id}"]`)
        await fill(`[data-testid="tab-group-editor-title-${id}"]`, 'Work')
      } else if (scene.id === '03-clear-extra-copies') {
        await click('button[aria-label="More toolbar actions"]')
        await waitFor(() =>
          Array.from(document.querySelectorAll('[role="menuitem"]')).some(
            (node) => /Close \d+ duplicate/.test(node.textContent),
          ),
        )
      } else if (
        ['04-command-palette', '05-save-tab-list'].includes(scene.id)
      ) {
        for (const id of fixture.windows[1].tabIds.slice(0, 3))
          await click(`[data-testid="tab-row-${id}"] input[type="checkbox"]`)
        await palette()
        if (scene.id === '05-save-tab-list') {
          await fill('input[aria-label="Search commands"]', 'export')
          await click(
            '[data-testid="command-palette"] [role="option"]',
            'Export 3 selected tabs',
          )
          await waitFor(() =>
            document.body.textContent.includes('Export Markdown'),
          )
        }
      } else if (scene.id === '06-make-it-comfortable') {
        await click('button[aria-label="Settings"]')
        await fill('input[aria-label="Search settings"]', 'Tab details')
        await waitFor(
          () =>
            !!document.querySelector(
              '[data-testid="settings-panel-tab-display"]',
            ),
        )
      }
      await sleep(900)
      await runtime.front()
      await runtime.park()
      await sleep(900)
      const state = await runtime.run(() => ({
        width: innerWidth,
        height: innerHeight,
        text: document.body.innerText,
        clippedWindows: Array.from(
          document.querySelectorAll('[data-testid^="window-"]'),
        )
          .filter((node) => /^window-\d+$/.test(node.dataset.testid))
          .map((node) => {
            const r = node.getBoundingClientRect()
            return { id: node.dataset.testid, left: r.left, right: r.right }
          })
          .filter((r) => r.left < -1 || r.right > innerWidth + 1),
        tooltips: Array.from(
          document.querySelectorAll('[role="tooltip"]'),
        ).filter(
          (node) =>
            node.getClientRects().length &&
            getComputedStyle(node).opacity !== '0',
        ).length,
        brokenImages: Array.from(document.querySelectorAll('img'))
          .filter(
            (node) =>
              node.getClientRects().length &&
              node.complete &&
              !node.naturalWidth,
          )
          .map((node) => node.src),
        colorSwatches: Array.from(
          document.querySelectorAll('.group-color-option'),
        ).map((node) => {
          const button = node.getBoundingClientRect()
          const dot = node.firstElementChild.getBoundingClientRect()
          return {
            width: button.width,
            height: button.height,
            dotWidth: dot.width,
            dotHeight: dot.height,
          }
        }),
      }))
      if (
        state.width !== 1280 ||
        state.height !== 800 ||
        state.clippedWindows.length ||
        state.tooltips ||
        state.brokenImages.length ||
        state.colorSwatches.some(
          (swatch) =>
            Math.abs(swatch.width - swatch.height) > 0.5 ||
            swatch.dotWidth !== 20 ||
            swatch.dotHeight !== 20,
        )
      )
        throw new Error('Invalid capture state: ' + JSON.stringify(state))
      const rawPath = join(profile, 'capture.png')
      await runtime.screenshot(rawPath)
      const file = `${scene.id}-${theme}.png`
      const path = join(destination, file)
      execFileSync('magick', [
        rawPath,
        '-alpha',
        'remove',
        '-alpha',
        'off',
        '-strip',
        '-define',
        'png:color-type=2',
        path,
      ])
      const sha256 = createHash('sha256')
        .update(readFileSync(path))
        .digest('hex')
      const existingRecord = records.findIndex((record) => record.file === file)
      if (existingRecord >= 0) records.splice(existingRecord, 1)
      records.push({
        ...scene,
        file,
        theme,
        sha256,
        browser: kind,
        browserVersion: runtime.version,
        sourceCommit,
        capturedAt: new Date().toISOString(),
        extensionVersion:
          candidateVersion ||
          JSON.parse(readFileSync(join(extension, 'manifest.json'))).version,
        viewport,
        colorSwatches: state.colorSwatches,
      })
      writeFileSync(
        join(destination, 'captures.json'),
        JSON.stringify(records, null, 2),
      )
      console.log(`Saved ${kind}/${file}`)
    }
  }
}

try {
  await main()
} finally {
  await cleanup()
  rmSync(profile, { recursive: true, force: true })
}
