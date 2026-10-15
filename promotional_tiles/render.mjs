/* global document */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC_DIR = join(__dirname, 'src')
const SCREENSHOT_DIR = join(
  __dirname,
  '..',
  'docs',
  'assets',
  'images',
  'release-candidates',
  'png',
)
const POSTER_SOURCE_DIR = join(
  __dirname,
  '..',
  'packages',
  'integration_test',
  'assets',
  'posters',
)

const pngDataUri = (path) =>
  `data:image/png;base64,${readFileSync(path).toString('base64')}`

const screenshotDataUri = (filename) =>
  pngDataUri(join(SCREENSHOT_DIR, filename))

const replacements = {
  '{{OVERVIEW_IMAGE}}': screenshotDataUri('01-overview-groups-light.png'),
  '{{GROUP_EDITING_IMAGE}}': screenshotDataUri('02-group-editing-light.png'),
  '{{SEARCH_GROUPS_IMAGE}}': screenshotDataUri('03-search-groups-light.png'),
  '{{KEYBOARD_SHORTCUTS_IMAGE}}': screenshotDataUri(
    '05-keyboard-shortcuts-light.png',
  ),
  '{{SCALE_DEMO_IMAGE}}': pngDataUri(
    join(POSTER_SOURCE_DIR, 'scale-demo-source.png'),
  ),
  '{{ICON_IMAGE}}': pngDataUri(
    join(
      __dirname,
      '..',
      'packages',
      'extension',
      'src',
      'img',
      'icon-128.png',
    ),
  ),
}

const outputs = [
  ['small-tile.svg', 'Small tile.png'],
  ['large-tile.svg', 'Large tile.png'],
  ['marquee.svg', 'Marquee.png'],
  ['marquee-1280x640.svg', 'Marquee 1280x640.png'],
  ['youtube-thumbnail-1280x720.svg', 'YouTube thumbnail 1280x720.png'],
]

const tempDir = mkdtempSync(join(tmpdir(), 'tab-manager-promo-'))
const browser =
  process.env.PROMO_TILE_RENDERER === 'browser'
    ? await createRequire(
        new URL('../packages/integration_test/package.json', import.meta.url),
      )('playwright').chromium.launch({
        executablePath: process.env.TMV2_TEST_BROWSER_PATH || undefined,
        headless: true,
      })
    : null

try {
  for (const [sourceName, outputName] of outputs) {
    const sourcePath = join(SRC_DIR, sourceName)
    const tempSvgPath = join(tempDir, sourceName)
    const tempPngPath = join(tempDir, outputName)

    let svg = readFileSync(sourcePath, 'utf8')
    for (const [token, value] of Object.entries(replacements)) {
      svg = svg.replaceAll(token, value)
    }

    writeFileSync(tempSvgPath, svg)

    if (browser) {
      const page = await browser.newPage()
      await page.setContent(`<style>body{margin:0}</style>${svg}`)
      await page.evaluate(() => document.fonts.ready)
      await page.locator('svg').screenshot({ path: tempPngPath })
      await page.close()
    } else {
      execFileSync('rsvg-convert', [tempSvgPath, '-o', tempPngPath], {
        stdio: 'inherit',
      })
    }
    execFileSync(
      'magick',
      [
        tempPngPath,
        '-alpha',
        'remove',
        '-alpha',
        'off',
        '-strip',
        '-define',
        'png:color-type=2',
        join(__dirname, outputName),
      ],
      { stdio: 'inherit' },
    )
  }

  execFileSync(
    'identify',
    outputs.map(([, outputName]) => join(__dirname, outputName)),
    { stdio: 'inherit' },
  )
} finally {
  await browser?.close()
  rmSync(tempDir, { force: true, recursive: true })
}
