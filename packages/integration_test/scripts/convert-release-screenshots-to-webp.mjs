#!/usr/bin/env node

import { readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join, parse } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ROOT_DIR = join(fileURLToPath(new URL('../../..', import.meta.url)))
const RELEASE_SCREENSHOT_DIR = join(
  ROOT_DIR,
  'docs/assets/images/release-candidates',
)
const PNG_DIR = join(RELEASE_SCREENSHOT_DIR, 'png')
const WEBP_DIR = join(RELEASE_SCREENSHOT_DIR, 'webp')
const WEBP_FULL_QUALITY = '88'
const WEBP_SMALL_QUALITY = '84'
const SMALL_WIDTH = '640'

function ensureMagickExists() {
  const result = spawnSync('magick', ['-version'], { stdio: 'ignore' })
  if (result.status !== 0) {
    throw new Error('ImageMagick `magick` is required to export WebP assets.')
  }
}

function ensurePngSourceExists() {
  if (!existsSync(PNG_DIR)) {
    throw new Error(
      `Missing PNG screenshots at ${PNG_DIR}. Run pnpm capture:release-screenshots first.`,
    )
  }
}

function listPngFiles() {
  return readdirSync(PNG_DIR)
    .filter((entry) => entry.endsWith('.png'))
    .sort()
}

function runMagick(args, outputPath) {
  const result = spawnSync('magick', args, { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`ImageMagick conversion failed for ${outputPath}`)
  }
}

function identify(path) {
  const result = spawnSync(
    'magick',
    ['identify', '-format', '%wx%h %[magick]', path],
    { encoding: 'utf8' },
  )
  return result.status === 0 ? result.stdout.trim() : 'unknown'
}

function toWebpPath(baseName) {
  return join(WEBP_DIR, `${baseName}.webp`)
}

function toSmallWebpPath(baseName) {
  return join(WEBP_DIR, `${baseName}-small.webp`)
}

function convertFullSize(sourcePath, outputPath) {
  runMagick(
    [
      sourcePath,
      '-strip',
      '-background',
      'white',
      '-alpha',
      'remove',
      '-alpha',
      'off',
      '-define',
      'webp:method=6',
      '-quality',
      WEBP_FULL_QUALITY,
      outputPath,
    ],
    outputPath,
  )
}

function convertSmallSize(sourcePath, outputPath) {
  runMagick(
    [
      sourcePath,
      '-strip',
      '-background',
      'white',
      '-alpha',
      'remove',
      '-alpha',
      'off',
      '-resize',
      `${SMALL_WIDTH}x`,
      '-define',
      'webp:method=6',
      '-quality',
      WEBP_SMALL_QUALITY,
      outputPath,
    ],
    outputPath,
  )
}

function main() {
  ensureMagickExists()
  ensurePngSourceExists()

  const pngFiles = listPngFiles()
  if (pngFiles.length === 0) {
    throw new Error(`No PNG screenshots found in ${PNG_DIR}`)
  }

  rmSync(WEBP_DIR, { recursive: true, force: true })
  mkdirSync(WEBP_DIR, { recursive: true })

  for (const pngFile of pngFiles) {
    const sourcePath = join(PNG_DIR, pngFile)
    const baseName = parse(pngFile).name
    const webpPath = toWebpPath(baseName)
    const smallWebpPath = toSmallWebpPath(baseName)

    convertFullSize(sourcePath, webpPath)
    convertSmallSize(sourcePath, smallWebpPath)

    console.log(`${baseName}.webp -> ${identify(webpPath)}`)
    console.log(`${baseName}-small.webp -> ${identify(smallWebpPath)}`)
  }
}

try {
  main()
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
