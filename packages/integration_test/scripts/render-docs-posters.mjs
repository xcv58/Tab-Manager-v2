#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = fileURLToPath(new URL('../../..', import.meta.url))
const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE_DIR = join(
  ROOT_DIR,
  'packages',
  'integration_test',
  'assets',
  'posters',
)
const OUTPUT_DIR = join(ROOT_DIR, 'docs', 'assets', 'images')

const pngDataUri = (path) =>
  `data:image/png;base64,${readFileSync(path).toString('base64')}`

const replacements = {
  '{{SCALE_DEMO_IMAGE}}': pngDataUri(join(SOURCE_DIR, 'scale-demo-source.png')),
  '{{ICON_IMAGE}}': pngDataUri(
    join(ROOT_DIR, 'packages', 'extension', 'src', 'img', 'icon-128.png'),
  ),
}

const outputs = [
  [
    'scale-demo-docs-poster.svg',
    'tab-manager-v2-1024-tabs-scale-demo-poster.jpg',
  ],
]

const tempDir = mkdtempSync(join(tmpdir(), 'tab-manager-docs-posters-'))

try {
  for (const [sourceName, outputName] of outputs) {
    const sourcePath = join(SOURCE_DIR, sourceName)
    const tempSvgPath = join(tempDir, sourceName)
    const tempPngPath = join(tempDir, outputName.replace(/\.jpg$/, '.png'))
    const outputPath = join(OUTPUT_DIR, outputName)

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
      [tempPngPath, '-strip', '-quality', '88', outputPath],
      { stdio: 'inherit' },
    )
  }

  execFileSync(
    'identify',
    outputs.map(([, outputName]) => join(OUTPUT_DIR, outputName)),
    { stdio: 'inherit' },
  )
} finally {
  rmSync(tempDir, { force: true, recursive: true })
}
