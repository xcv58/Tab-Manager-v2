import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const imageDataUri = (filename) =>
  `data:image/png;base64,${readFileSync(join(SCREENSHOT_DIR, filename)).toString('base64')}`

const replacements = {
  '{{OVERVIEW_IMAGE}}': imageDataUri('01-overview-groups-light.png'),
  '{{GROUP_EDITING_IMAGE}}': imageDataUri('02-group-editing-light.png'),
  '{{SEARCH_GROUPS_IMAGE}}': imageDataUri('03-search-groups-light.png'),
  '{{KEYBOARD_SHORTCUTS_IMAGE}}': imageDataUri(
    '05-keyboard-shortcuts-light.png',
  ),
  '{{ICON_IMAGE}}': `data:image/png;base64,${readFileSync(join(__dirname, '..', 'packages', 'extension', 'src', 'img', 'icon-128.png')).toString('base64')}`,
}

const outputs = [
  ['small-tile.svg', 'Small tile.png'],
  ['large-tile.svg', 'Large tile.png'],
  ['marquee.svg', 'Marquee.png'],
  ['marquee-1280x640.svg', 'Marquee 1280x640.png'],
]

const tempDir = mkdtempSync(join(tmpdir(), 'tab-manager-promo-'))

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

    execFileSync('rsvg-convert', [tempSvgPath, '-o', tempPngPath], {
      stdio: 'inherit',
    })
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
  rmSync(tempDir, { force: true, recursive: true })
}
