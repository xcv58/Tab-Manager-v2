#!/usr/bin/env node
/* global URL, console */

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { fileURLToPath } from 'node:url'
import { basename, join } from 'node:path'
import {
  hashFile,
  integrationTestFiles,
  suitePaths,
  validateSuiteRecordings,
} from './capture-provenance.mjs'

const ROOT_DIR =
  process.env.CAPTURE_ROOT_DIR ||
  fileURLToPath(new URL('../../..', import.meta.url))
const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url))
const TEST_DIR = join(PACKAGE_DIR, 'test')
const PARTIAL = Boolean(process.env.TEST_VIDEO_FILES?.trim())
const paths = suitePaths(ROOT_DIR, PARTIAL)
const OUTPUT_DIR = paths.directory
const RAW_CLIP_DIR = join(OUTPUT_DIR, 'clips')
const FAST_CLIP_DIR = join(OUTPUT_DIR, 'sped-up')
const CONCAT_LIST_PATH = join(OUTPUT_DIR, 'concat.txt')
const MANIFEST_PATH = join(OUTPUT_DIR, 'recordings.json')
const FINAL_OUTPUT_DIR = join(ROOT_DIR, '.tmp/video-captures/mp4')
const FINAL_OUTPUT_PATH = paths.video

const PLAYBACK_SPEED = Number(process.env.TEST_VIDEO_SPEED || '10')
const OUTPUT_FPS = 25
const RESUME = process.env.TEST_VIDEO_RESUME === '1'
const ASSEMBLE_ONLY = process.env.TEST_VIDEO_ASSEMBLE_ONLY === '1'
const CONTINUE_ON_FAILURE = process.env.TEST_VIDEO_CONTINUE_ON_FAILURE !== '0'
const RECAPTURE_FILES = new Set(
  String(process.env.TEST_VIDEO_RECAPTURE_FILES || '')
    .split(',')
    .filter(Boolean),
)
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
  const all = integrationTestFiles(TEST_DIR)
  for (const file of REQUESTED_TEST_FILES)
    if (!all.includes(file))
      throw new Error(`Unknown requested test file: ${file}`)
  return all.filter(
    (file) => !REQUESTED_TEST_FILES.size || REQUESTED_TEST_FILES.has(file),
  )
}

function recordingHashes(file, clips) {
  return {
    testSha256: hashFile(join(TEST_DIR, file)),
    clipHashes: clips.map((name) => ({
      name,
      rawSha256: hashFile(join(RAW_CLIP_DIR, name)),
      spedUpSha256: hashFile(join(FAST_CLIP_DIR, name)),
    })),
  }
}

function canReuse(saved, file) {
  try {
    validateSuiteRecordings([saved], TEST_DIR, [file])
    const current = recordingHashes(file, saved.clips)
    return saved.clipHashes.every((clip) => {
      const verified = current.clipHashes.find(
        (entry) => entry.name === clip.name,
      )
      return (
        clip.rawSha256 === verified.rawSha256 &&
        clip.spedUpSha256 === verified.spedUpSha256
      )
    })
  } catch {
    return false
  }
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
    clips
      .map((clipPath) => `file '${clipPath.replace(/'/g, "'\\''")}'`)
      .join('\n'),
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
  if (ASSEMBLE_ONLY && (!RESUME || RECAPTURE_FILES.size))
    throw new Error(
      'Assemble-only requires TEST_VIDEO_RESUME=1 and no recapture request',
    )
  if (files.length === 0) {
    throw new Error(`No test files found in ${TEST_DIR}`)
  }

  if (!Number.isFinite(PLAYBACK_SPEED) || PLAYBACK_SPEED <= 1) {
    throw new Error(
      `TEST_VIDEO_SPEED must be greater than 1. Received: ${process.env.TEST_VIDEO_SPEED}`,
    )
  }

  const previous =
    RESUME && existsSync(MANIFEST_PATH)
      ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
      : null
  if (previous && previous.playbackSpeed !== PLAYBACK_SPEED)
    throw new Error(
      'Resume requires the same TEST_VIDEO_SPEED as the saved recording',
    )
  if (!RESUME) rmSync(OUTPUT_DIR, { recursive: true, force: true })
  ensureDirectory(RAW_CLIP_DIR)
  ensureDirectory(FAST_CLIP_DIR)
  ensureDirectory(FINAL_OUTPUT_DIR)

  const spedUpClips = []
  const failedFiles = []
  const recordings = []
  let totalRawSeconds = 0
  let totalFinalSeconds = 0

  for (const [index, file] of files.entries()) {
    const label = clipLabel(index, file)
    const saved = previous?.recordings.find((entry) => entry.file === file)
    if (!RECAPTURE_FILES.has(file) && canReuse(saved, file)) {
      console.log(`Reusing passed recording for ${file}`)
      for (const clip of saved.clips) {
        totalRawSeconds += ffprobeDuration(join(RAW_CLIP_DIR, clip))
        totalFinalSeconds += ffprobeDuration(join(FAST_CLIP_DIR, clip))
        spedUpClips.push(join(FAST_CLIP_DIR, clip))
      }
      recordings.push(saved)
      continue
    }

    if (ASSEMBLE_ONLY)
      throw new Error(`Cannot reassemble unverified saved recording: ${file}`)

    // Replace only this file's generated takes when recovering a failed run.
    for (const clip of readdirSync(RAW_CLIP_DIR).filter(
      (entry) => entry.startsWith(`${label}-`) && entry.endsWith('.mp4'),
    )) {
      rmSync(join(RAW_CLIP_DIR, clip), { force: true })
      rmSync(join(FAST_CLIP_DIR, clip), { force: true })
    }

    console.log(`\n=== Recording ${file} (${index + 1}/${files.length}) ===`)

    const passed = runCommand(
      'pnpm',
      [
        'exec',
        'playwright',
        'test',
        join('test', file),
        '--project=chromium',
        '--workers=1',
        '--retries=0',
        '--reporter=line',
      ],
      `running ${file}`,
      {
        TMV2_RECORD_TEST_VIDEO_DIR: RAW_CLIP_DIR,
        TMV2_RECORD_TEST_VIDEO_LABEL: label,
      },
      CONTINUE_ON_FAILURE,
    )

    const clips = readdirSync(RAW_CLIP_DIR)
      .filter(
        (entry) => entry.startsWith(`${label}-`) && entry.endsWith('.mp4'),
      )
      .sort()
    if (clips.length === 0) throw new Error(`No recorded clips for ${file}`)
    if (!passed) {
      failedFiles.push(file)
      console.warn(`Continuing after test failures in ${file}`)
    }
    console.log(`\n=== Speeding up ${file} (${clips.length} recordings) ===`)
    for (const clip of clips) {
      const rawClipPath = join(RAW_CLIP_DIR, clip)
      const fastClipPath = join(FAST_CLIP_DIR, clip)
      totalRawSeconds += ffprobeDuration(rawClipPath)
      speedUpClip(rawClipPath, fastClipPath)
      totalFinalSeconds += ffprobeDuration(fastClipPath)
      spedUpClips.push(fastClipPath)
    }
    recordings.push({ file, passed, clips, ...recordingHashes(file, clips) })
    // Retain completed later files during a selective recovery run. Otherwise
    // an interruption would discard their metadata before reaching them.
    const remaining = (previous?.recordings || []).filter(
      (entry) => !recordings.some((recording) => recording.file === entry.file),
    )
    const progress = [...recordings, ...remaining]
    writeFileSync(
      MANIFEST_PATH,
      JSON.stringify(
        {
          complete: false,
          playbackSpeed: PLAYBACK_SPEED,
          recordings: progress,
          failedFiles: progress
            .filter((entry) => !entry.passed)
            .map((entry) => entry.file),
        },
        null,
        2,
      ),
    )
  }

  if (!failedFiles.length) validateSuiteRecordings(recordings, TEST_DIR, files)
  concatClips(spedUpClips)

  const finalDuration = ffprobeDuration(FINAL_OUTPUT_PATH)
  writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(
      {
        complete: !PARTIAL && failedFiles.length === 0,
        playbackSpeed: PLAYBACK_SPEED,
        recordings,
        failedFiles,
        finalDuration,
        sha256: hashFile(FINAL_OUTPUT_PATH),
      },
      null,
      2,
    ),
  )
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
