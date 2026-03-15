#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { chromium } from 'playwright'

const ROOT_DIR =
  process.env.CAPTURE_ROOT_DIR ||
  fileURLToPath(new URL('../../..', import.meta.url))
const VIDEO_DIR = join(ROOT_DIR, '.tmp/video-captures/mp4')
const PROMO_DIR = join(ROOT_DIR, '.tmp/video-captures/promo')
const SEGMENT_DIR = join(PROMO_DIR, 'segments')
const ASSET_DIR = join(PROMO_DIR, 'assets')
const OUTPUT_PATH = join(PROMO_DIR, 'tab-manager-v2-feature-promo.mp4')
const ICON_PATH = join(ROOT_DIR, 'packages/extension/src/img/icon-128.png')

const CANVAS_WIDTH = 1920
const CANVAS_HEIGHT = 1080
const CLIP_WIDTH = 1368
const CLIP_X = 500
const CLIP_Y = 96
const FPS = 25
const SCENE_TRANSITION_SECONDS = 0.18
const STAGE_COLOR = '#1c2129'
const SURFACE_COLOR = '#272c36'
const SURFACE_COLOR_ALT = '#303640'
const BRAND_ACCENT = '#818cf8'

const CLIPS = [
  {
    id: '01-find-tab-fast',
    chapter: '01 / 06',
    title: 'Find The Right Tab Fast',
    subtitle: 'Search across windows and grouped tabs in seconds.',
    accent: BRAND_ACCENT,
  },
  {
    id: '03-clean-up-duplicates',
    chapter: '02 / 06',
    title: 'Clean Up Duplicate Tabs',
    subtitle: 'Remove repeated pages before they pile up.',
    accent: BRAND_ACCENT,
  },
  {
    id: '02-organize-groups',
    chapter: '03 / 06',
    title: 'Rename And Organize Groups',
    subtitle: 'Turn scattered tabs into clear workspaces.',
    accent: BRAND_ACCENT,
  },
  {
    id: '04-see-large-workspaces-clearly',
    chapter: '04 / 06',
    title: 'Stay Oriented At Scale',
    subtitle: 'Keep large browser sessions readable at a glance.',
    accent: BRAND_ACCENT,
  },
  {
    id: '05-keyboard-workflow',
    chapter: '05 / 06',
    title: 'Move Faster With Shortcuts',
    subtitle: 'Jump into actions without slowing down.',
    accent: BRAND_ACCENT,
  },
  {
    id: '06-customize-the-view',
    chapter: '06 / 06',
    title: 'Make The View Your Own',
    subtitle: 'Tune theme and density for your workflow.',
    accent: BRAND_ACCENT,
  },
]

function ensureExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label} at ${path}`)
  }
}

function runFfmpeg(args, label) {
  const result = spawnSync('ffmpeg', ['-y', ...args], {
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed while ${label}`)
  }
}

function runFfprobe(args, label) {
  const result = spawnSync('ffprobe', args, {
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    throw new Error(`ffprobe failed while ${label}: ${result.stderr}`)
  }

  return result.stdout.trim()
}

function durationForVideo(path) {
  return Number(
    runFfprobe(
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        path,
      ],
      `reading duration for ${path}`,
    ),
  )
}

function clipOutputPath(id) {
  return join(VIDEO_DIR, `${id}.mp4`)
}

function segmentOutputPath(name) {
  return join(SEGMENT_DIR, `${name}.mp4`)
}

function overlayAssetPath(name) {
  return join(ASSET_DIR, `${name}.png`)
}

function fileDataUrl(path, mimeType) {
  return `data:${mimeType};base64,${readFileSync(path).toString('base64')}`
}

function cssShared({ transparent }) {
  return `
    :root {
      color-scheme: dark;
      --bg: ${STAGE_COLOR};
      --surface: ${SURFACE_COLOR};
      --surface-alt: ${SURFACE_COLOR_ALT};
      --surface-border: rgba(90, 101, 123, 0.62);
      --frame-border: rgba(214, 220, 232, 0.18);
      --shadow: rgba(5, 9, 16, 0.56);
      --text: #eef0f6;
      --muted: #8b93a4;
      --accent: ${BRAND_ACCENT};
      --accent-soft: rgba(129, 140, 248, 0.14);
      --accent-border: rgba(129, 140, 248, 0.28);
      --accent-glow-strong: rgba(99, 102, 241, 0.22);
      --accent-glow-soft: rgba(129, 140, 248, 0.12);
      --line: rgba(214, 220, 232, 0.12);
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      width: ${CANVAS_WIDTH}px;
      height: ${CANVAS_HEIGHT}px;
      margin: 0;
      overflow: hidden;
      background: ${transparent ? 'transparent' : 'var(--bg)'};
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Avenir Next",
        "SF Pro Display",
        sans-serif;
    }
    body {
      position: relative;
    }
    .frame {
      position: relative;
      width: 100%;
      height: 100%;
      background:
        radial-gradient(circle at 14% 18%, var(--accent-glow-strong) 0%, transparent 28%),
        radial-gradient(circle at 82% 76%, var(--accent-glow-soft) 0%, transparent 26%)
        ${transparent ? '' : `,
        linear-gradient(180deg, #232936 0%, #181d25 100%)`};
    }
    .top-rule {
      position: absolute;
      left: 72px;
      top: 72px;
      width: 1776px;
      height: 1px;
      background: var(--line);
    }
    .info-card {
      position: absolute;
      left: 72px;
      top: 108px;
      width: 372px;
      min-height: 760px;
      padding: 28px 30px 34px;
      border-radius: 34px;
      background:
        linear-gradient(180deg, rgba(48, 55, 66, 0.98) 0%, rgba(34, 39, 48, 0.98) 100%);
      background-origin: border-box;
      background-clip: border-box;
      border: 1px solid var(--surface-border);
      box-shadow:
        0 26px 90px rgba(0, 0, 0, 0.32),
        0 0 0 1px rgba(129, 140, 248, 0.03);
      overflow: hidden;
    }
    .accent-line {
      position: absolute;
      left: -1px;
      top: -1px;
      bottom: -1px;
      width: 14px;
    }
    .brand {
      position: absolute;
      left: 34px;
      top: 30px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand img {
      width: 38px;
      height: 38px;
      display: block;
      object-fit: contain;
    }
    .brand-copy {
      color: var(--muted);
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .chapter {
      position: absolute;
      left: 34px;
      top: 92px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 118px;
      height: 34px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .title {
      position: absolute;
      left: 34px;
      top: 148px;
      width: 304px;
      color: var(--text);
      font-size: 44px;
      font-weight: 800;
      line-height: 1.02;
      letter-spacing: -0.04em;
    }
    .subtitle {
      position: absolute;
      left: 34px;
      top: 338px;
      width: 292px;
      color: var(--muted);
      font-size: 21px;
      font-weight: 500;
      line-height: 1.34;
    }
    .story-label {
      position: absolute;
      left: 34px;
      bottom: 34px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .clip-frame {
      position: absolute;
      left: ${CLIP_X - 18}px;
      top: ${CLIP_Y - 18}px;
      width: ${CLIP_WIDTH + 36}px;
      height: calc(${Math.round(CLIP_WIDTH * 1678 / 2564)}px + 36px);
      border-radius: 30px;
      border: 1px solid var(--frame-border);
      box-shadow:
        0 32px 90px rgba(0, 0, 0, 0.42),
        0 0 48px rgba(99, 102, 241, 0.08),
        inset 0 0 0 1px rgba(214, 220, 232, 0.05);
      pointer-events: none;
    }
    .intro-card,
    .outro-card {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      border-radius: 34px;
      background:
        linear-gradient(180deg, rgba(48, 55, 66, 0.98) 0%, rgba(34, 39, 48, 0.98) 100%);
      border: 1px solid var(--surface-border);
      box-shadow:
        0 30px 110px rgba(0, 0, 0, 0.34),
        0 0 0 1px rgba(129, 140, 248, 0.03);
      text-align: left;
      overflow: hidden;
    }
    .intro-card {
      top: 176px;
      width: 920px;
      min-height: 574px;
      padding: 56px 72px 64px;
    }
    .outro-card {
      top: 232px;
      width: 780px;
      min-height: 420px;
      padding: 50px 64px 56px;
    }
    .card-accent {
      position: absolute;
      left: -1px;
      top: -1px;
      bottom: -1px;
      width: 14px;
    }
    .card-icon {
      display: block;
      margin: 8px 0 18px;
      object-fit: contain;
    }
    .eyebrow {
      color: var(--muted);
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .hero {
      margin-top: 22px;
      color: var(--text);
      font-size: 82px;
      font-weight: 800;
      line-height: 0.94;
      letter-spacing: -0.05em;
    }
    .hero.small {
      font-size: 62px;
      margin-top: 18px;
    }
    .deck {
      margin-top: 26px;
      color: var(--muted);
      font-size: 27px;
      font-weight: 500;
      line-height: 1.34;
    }
    .deck.small {
      font-size: 24px;
      margin-top: 18px;
    }
    .intro-meta {
      margin-top: 36px;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      border-radius: 999px;
      border: 1px solid var(--accent-border);
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
  `
}

function segmentOverlayHtml(segment, iconUrl) {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>${cssShared({ transparent: true })}
        .chapter {
          background: var(--accent-soft);
          border-color: var(--accent-border);
          color: ${segment.accent};
        }
        .info-card {
          background:
            linear-gradient(90deg, ${segment.accent} 0 14px, rgba(48, 55, 66, 0.98) 14px),
            linear-gradient(180deg, rgba(48, 55, 66, 0.98) 0%, rgba(34, 39, 48, 0.98) 100%);
          background-origin: border-box;
          background-clip: border-box;
          border-left-color: transparent;
        }
        .accent-line {
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="frame">
        <div class="top-rule"></div>
        <div class="info-card">
          <div class="accent-line"></div>
          <div class="brand">
            <img src="${iconUrl}" alt="" />
            <div class="brand-copy">Tab Manager v2</div>
          </div>
          <div class="chapter">${segment.chapter}</div>
          <div class="title">${segment.title}</div>
          <div class="subtitle">${segment.subtitle}</div>
          <div class="story-label">Feature Highlight</div>
        </div>
        <div class="clip-frame"></div>
      </div>
    </body>
  </html>`
}

function introCardHtml(iconUrl) {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>${cssShared({ transparent: false })}
        .card-accent {
          background: ${BRAND_ACCENT};
        }
        .card-icon {
          width: 78px;
          height: 78px;
        }
      </style>
    </head>
    <body>
      <div class="frame">
        <div class="intro-card">
          <div class="card-accent"></div>
          <img class="card-icon" src="${iconUrl}" alt="" />
          <div class="eyebrow">Tab Manager v2</div>
          <div class="hero">Organize Every Tab, Fast</div>
          <div class="deck">
            Search, clean up, group, and customize without leaving the browser.
          </div>
          <div class="intro-meta">Six feature stories</div>
        </div>
      </div>
    </body>
  </html>`
}

function outroCardHtml(iconUrl) {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>${cssShared({ transparent: false })}
        .card-accent {
          background: ${BRAND_ACCENT};
        }
        .card-icon {
          width: 72px;
          height: 72px;
        }
      </style>
    </head>
    <body>
      <div class="frame">
        <div class="outro-card">
          <div class="card-accent"></div>
          <img class="card-icon" src="${iconUrl}" alt="" />
          <div class="hero small">Tab Manager v2</div>
          <div class="deck small">Search. Clean Up. Organize.</div>
          <div class="deck small">Chrome extension for crowded browser workflows.</div>
        </div>
      </div>
    </body>
  </html>`
}

async function renderHtmlPng(page, { html, outputPath, transparent }) {
  await page.setViewportSize({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  })
  await page.setContent(html, {
    waitUntil: 'load',
  })
  await page.screenshot({
    path: outputPath,
    omitBackground: transparent,
  })
}

async function buildOverlayAssets() {
  const browser = await chromium.launch({
    headless: true,
  })
  const page = await browser.newPage()
  const iconUrl = fileDataUrl(ICON_PATH, 'image/png')

  try {
    await renderHtmlPng(page, {
      html: introCardHtml(iconUrl),
      outputPath: overlayAssetPath('00-intro'),
      transparent: false,
    })

    for (const clip of CLIPS) {
      await renderHtmlPng(page, {
        html: segmentOverlayHtml(clip, iconUrl),
        outputPath: overlayAssetPath(clip.id),
        transparent: true,
      })
    }

    await renderHtmlPng(page, {
      html: outroCardHtml(iconUrl),
      outputPath: overlayAssetPath('07-outro'),
      transparent: false,
    })
  } finally {
    await browser.close()
  }
}

function compositeClipFilter(duration) {
  return [
    `[0:v]split=2[clip_fg][clip_bg]`,
    `[clip_bg]scale=${CANVAS_WIDTH}:${CANVAS_HEIGHT}:force_original_aspect_ratio=increase,crop=${CANVAS_WIDTH}:${CANVAS_HEIGHT},boxblur=52:10,eq=saturation=0.24:brightness=-0.34:contrast=0.95,format=rgba,colorchannelmixer=aa=0.16[bgclip]`,
    `color=c=${STAGE_COLOR}:s=${CANVAS_WIDTH}x${CANVAS_HEIGHT}:d=${duration}[base]`,
    `[base][bgclip]overlay=0:0[bg]`,
    `[clip_fg]scale=${CLIP_WIDTH}:-2[fg]`,
    `[bg][fg]overlay=${CLIP_X}:${CLIP_Y}[bg_with_fg]`,
    `[bg_with_fg][1:v]overlay=0:0[composite]`,
    `[composite]format=yuv420p[vout]`,
  ].join(';')
}

function renderClipSegment(segment) {
  const inputPath = clipOutputPath(segment.id)
  const overlayPath = overlayAssetPath(segment.id)
  ensureExists(inputPath, `source clip ${segment.id}`)
  ensureExists(overlayPath, `overlay asset ${segment.id}`)

  const duration = durationForVideo(inputPath)
  const outputPath = segmentOutputPath(segment.id)

  runFfmpeg(
    [
      '-i',
      inputPath,
      '-loop',
      '1',
      '-t',
      String(duration),
      '-i',
      overlayPath,
      '-filter_complex',
      compositeClipFilter(duration),
      '-map',
      '[vout]',
      '-r',
      String(FPS),
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputPath,
    ],
    `rendering ${segment.id}`,
  )

  return outputPath
}

function renderStillCardSegment({ assetName, segmentName, duration }) {
  const assetPath = overlayAssetPath(assetName)
  ensureExists(assetPath, `card asset ${assetName}`)
  const outputPath = segmentOutputPath(segmentName)

  runFfmpeg(
    [
      '-loop',
      '1',
      '-t',
      String(duration),
      '-i',
      assetPath,
      '-r',
      String(FPS),
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputPath,
    ],
    `rendering ${segmentName}`,
  )

  return outputPath
}

function xfadeSegments(paths) {
  const durations = paths.map((path) => durationForVideo(path))
  const filterParts = []
  let offset = durations[0] - SCENE_TRANSITION_SECONDS
  let currentLabel = '[0:v]'

  for (let index = 1; index < paths.length; index += 1) {
    const outputLabel = index === paths.length - 1 ? '[vxf]' : `[vxf${index}]`
    filterParts.push(
      `${currentLabel}[${index}:v]xfade=transition=fade:duration=${SCENE_TRANSITION_SECONDS}:offset=${offset.toFixed(3)}${outputLabel}`,
    )
    currentLabel = outputLabel
    offset += durations[index] - SCENE_TRANSITION_SECONDS
  }

  filterParts.push(`${currentLabel}format=yuv420p[vout]`)

  const args = paths.flatMap((path) => ['-i', path])
  args.push(
    '-filter_complex',
    filterParts.join(';'),
    '-map',
    '[vout]',
    '-an',
    '-r',
    String(FPS),
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    OUTPUT_PATH,
  )

  runFfmpeg(args, 'crossfading promo segments')
}

async function main() {
  ensureExists(VIDEO_DIR, 'captured feature clip directory')
  ensureExists(ICON_PATH, 'extension icon')

  rmSync(PROMO_DIR, { recursive: true, force: true })
  mkdirSync(SEGMENT_DIR, { recursive: true })
  mkdirSync(ASSET_DIR, { recursive: true })

  await buildOverlayAssets()

  const segmentPaths = []
  segmentPaths.push(
    renderStillCardSegment({
      assetName: '00-intro',
      segmentName: '00-intro',
      duration: 2.4,
    }),
  )

  for (const clip of CLIPS) {
    segmentPaths.push(renderClipSegment(clip))
  }

  segmentPaths.push(
    renderStillCardSegment({
      assetName: '07-outro',
      segmentName: '07-outro',
      duration: 2.6,
    }),
  )

  xfadeSegments(segmentPaths)
  console.log(OUTPUT_PATH)
}

await main()
