#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { fileURLToPath } from 'node:url'
import { basename, join } from 'node:path'

const ROOT_DIR =
  process.env.CAPTURE_ROOT_DIR ||
  fileURLToPath(new URL('../../..', import.meta.url))
const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url))
const TEST_DIR = join(PACKAGE_DIR, 'test')
const OUTPUT_DIR = join(ROOT_DIR, '.tmp/video-captures/integration-test-suite')
const RAW_CLIP_DIR = join(OUTPUT_DIR, 'clips')
const FAST_CLIP_DIR = join(OUTPUT_DIR, 'sped-up')
const CONCAT_LIST_PATH = join(OUTPUT_DIR, 'concat.txt')
const FINAL_OUTPUT_DIR = join(ROOT_DIR, '.tmp/video-captures/mp4')
const FINAL_OUTPUT_PATH = join(
  FINAL_OUTPUT_DIR,
  'tab-manager-v2-integration-test-suite.mp4',
)

const PLAYBACK_SPEED = Number(process.env.TEST_VIDEO_SPEED || '10')
const OUTPUT_FPS = 25
const CONTINUE_ON_FAILURE =
  process.env.TEST_VIDEO_CONTINUE_ON_FAILURE !== '0'
const REQUESTED_TEST_FILES = new Set(
  String(process.env.TEST_VIDEO_FILES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)

function ensureDirectory(path) {
  mkdirSync(path, { recursive: true })
}

function ensureExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label} at ${path}`)
  }
}

function runCommand(command, args, label, env = {}, allowFailure = false) {
  const result = spawnSync(command, args, {
    cwd: PACKAGE_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...env,
    },
  })

  if (result.status !== 0) {
    if (allowFailure) {
      return false
    }
    throw new Error(`${label} failed`)
  }

  return true
}

function runFfmpeg(args, label) {
  const result = spawnSync('ffmpeg', ['-y', ...args], {
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed while ${label}`)
  }
}

function ffprobeDuration(path) {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      path,
    ],
    {
      encoding: 'utf8',
    },
  )

  if (result.status !== 0) {
    throw new Error(`ffprobe failed for ${path}: ${result.stderr}`)
  }

  return Number(result.stdout.trim())
}

function testFiles() {
  return readdirSync(TEST_DIR)
    .filter((entry) => entry.endsWith('.test.ts'))
    .filter(
      (entry) =>
        REQUESTED_TEST_FILES.size === 0 || REQUESTED_TEST_FILES.has(entry),
    )
    .sort()
}

function clipLabel(index, file) {
  return `${String(index + 1).padStart(2, '0')}-${file.replace(/\.test\.ts$/, '')}`
}

function speedUpClip(sourcePath, outputPath) {
  ensureExists(sourcePath, 'raw clip')
  rmSync(outputPath, { force: true })

  runFfmpeg(
    [
      '-i',
      sourcePath,
      '-an',
      '-vf',
      `setpts=${(1 / PLAYBACK_SPEED).toFixed(6)}*PTS,fps=${OUTPUT_FPS}`,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputPath,
    ],
    `speeding up ${basename(sourcePath)}`,
  )
}

function concatClips(clips) {
  writeFileSync(
    CONCAT_LIST_PATH,
    clips.map((clipPath) => `file '${clipPath.replace(/'/g, "'\\''")}'`).join('\n'),
  )

  rmSync(FINAL_OUTPUT_PATH, { force: true })
  runFfmpeg(
    [
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      CONCAT_LIST_PATH,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '22',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      FINAL_OUTPUT_PATH,
    ],
    'concatenating sped-up clips',
  )
}

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function main() {
  const files = testFiles()
  if (files.length === 0) {
    throw new Error(`No test files found in ${TEST_DIR}`)
  }

  if (!Number.isFinite(PLAYBACK_SPEED) || PLAYBACK_SPEED <= 1) {
    throw new Error(
      `TEST_VIDEO_SPEED must be greater than 1. Received: ${process.env.TEST_VIDEO_SPEED}`,
    )
  }

  rmSync(OUTPUT_DIR, { recursive: true, force: true })
  ensureDirectory(RAW_CLIP_DIR)
  ensureDirectory(FAST_CLIP_DIR)
  ensureDirectory(FINAL_OUTPUT_DIR)

  const spedUpClips = []
  const failedFiles = []
  let totalRawSeconds = 0
  let totalFinalSeconds = 0

  for (const [index, file] of files.entries()) {
    const label = clipLabel(index, file)
    const rawClipPath = join(RAW_CLIP_DIR, `${label}.mp4`)
    const fastClipPath = join(FAST_CLIP_DIR, `${label}.mp4`)

    console.log(`\n=== Recording ${file} (${index + 1}/${files.length}) ===`)
    rmSync(rawClipPath, { force: true })

    const passed = runCommand(
      'pnpm',
      [
        'exec',
        'playwright',
        'test',
        join('test', file),
        '--project=chromium',
        '--workers=1',
        '--reporter=line',
      ],
      `running ${file}`,
      {
        TMV2_RECORD_TEST_VIDEO_DIR: RAW_CLIP_DIR,
        TMV2_RECORD_TEST_VIDEO_LABEL: label,
      },
      CONTINUE_ON_FAILURE,
    )

    ensureExists(rawClipPath, `recorded clip for ${file}`)
    if (!passed) {
      failedFiles.push(file)
      console.warn(`Continuing after test failures in ${file}`)
    }
    totalRawSeconds += ffprobeDuration(rawClipPath)

    console.log(`\n=== Speeding up ${file} ===`)
    speedUpClip(rawClipPath, fastClipPath)
    totalFinalSeconds += ffprobeDuration(fastClipPath)
    spedUpClips.push(fastClipPath)
  }

  concatClips(spedUpClips)

  const finalDuration = ffprobeDuration(FINAL_OUTPUT_PATH)
  console.log(`\nSaved ${FINAL_OUTPUT_PATH}`)
  console.log(
    `Captured ${files.length} files: raw ${formatSeconds(totalRawSeconds)}, sped-up ${formatSeconds(totalFinalSeconds)}, final ${formatSeconds(finalDuration)} at ${PLAYBACK_SPEED}x`,
  )
  if (failedFiles.length > 0) {
    console.warn(
      `Video capture completed with test failures in: ${failedFiles.join(', ')}`,
    )
  }
}

main()
