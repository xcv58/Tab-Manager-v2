// Promote completed, locally reviewed captures into the public asset tree.
// This only updates files in the checkout; it does not deploy or publish.
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import { URL, fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { SAMPLE_SITES } from './capture-sites.mjs'
import {
  hashFile,
  PROMO_CLIP_IDS,
  SCALE_CLIP_ID,
  validateFeatures,
  validatePromo,
  validateSuite,
} from './capture-provenance.mjs'

const root =
  process.env.CAPTURE_ROOT_DIR ||
  fileURLToPath(new URL('../../..', import.meta.url))
const captures = join(root, '.tmp/video-captures')
const promo = join(captures, 'promo/tab-manager-v2-feature-promo.mp4')
const scale = join(captures, 'mp4/08-thousand-twenty-four-tabs-scale.mp4')
const suite = join(captures, 'mp4/tab-manager-v2-integration-test-suite.mp4')
const captions = join(captures, 'promo/captions.vtt')
for (const path of [promo, scale, suite, captions]) {
  if (!existsSync(path)) throw new Error(`Missing completed capture: ${path}`)
}
const catalogueHash = createHash('sha256')
  .update(JSON.stringify(SAMPLE_SITES))
  .digest('hex')
const featureProof = JSON.parse(
  readFileSync(join(captures, 'capture-manifest.json'), 'utf8'),
)
const promoProof = JSON.parse(
  readFileSync(join(captures, 'promo/provenance.json'), 'utf8'),
)
const suiteProof = JSON.parse(
  readFileSync(
    join(captures, 'integration-test-suite/recordings.json'),
    'utf8',
  ),
)
validateFeatures(featureProof, catalogueHash, join(captures, 'mp4'), [
  ...PROMO_CLIP_IDS,
  SCALE_CLIP_ID,
])
validatePromo(
  promoProof,
  featureProof,
  catalogueHash,
  join(captures, 'mp4'),
  promo,
)
validateSuite(suiteProof, join(root, 'packages/integration_test/test'), suite)
if (
  promoProof.captionsSha256 !== hashFile(captions) ||
  promoProof.chaptersSha256 !== hashFile(join(captures, 'promo/chapters.json'))
)
  throw new Error(
    'Rebuild the promo captions and chapters with the current clips',
  )

// Parse and validate every input before extracting posters or changing public files.
const chapters = JSON.parse(
  readFileSync(join(captures, 'promo/chapters.json'), 'utf8'),
)
if (
  chapters.length !== PROMO_CLIP_IDS.length ||
  chapters.some(
    (chapter, index) =>
      chapter.id !== PROMO_CLIP_IDS[index] ||
      !Number.isFinite(chapter.start) ||
      !Number.isFinite(chapter.end) ||
      chapter.start < 0 ||
      chapter.end <= chapter.start ||
      (index > 0 && chapter.start < chapters[index - 1].end - 0.001),
  )
)
  throw new Error('Invalid promo chapters')
const homepagePath = join(root, 'docs/index.html')
let chapterIndex = 0
const homepage = readFileSync(homepagePath, 'utf8').replace(
  /(data-video-seek=")[^"]+("\s*>\s*<span class="video-tour-chapter-time">)[^<]+/g,
  (_match, before, after) => {
    const chapter = chapters[chapterIndex++]
    if (!chapter)
      throw new Error('More website chapter buttons than captured chapters')
    const seconds = Math.floor(chapter.start)
    const label = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    return `${before}${Number(chapter.start.toFixed(2))}${after}${label}`
  },
)
if (chapterIndex !== chapters.length)
  throw new Error('Website chapter buttons do not match the captured chapters')

const staging = mkdtempSync(join(tmpdir(), 'tmv2-public-posters-'))
try {
  // Retain raster sources outside docs so posters can be rebuilt independently.
  for (const [video, seconds, name] of [
    [promo, 5, 'feature-promo-source.png'],
    [scale, 0.5, 'scale-demo-source.png'],
  ]) {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-ss',
        String(seconds),
        '-i',
        video,
        '-frames:v',
        '1',
        '-update',
        '1',
        join(staging, name),
      ],
      { stdio: 'inherit' },
    )
  }
  for (const [source, target] of [
    [promo, 'docs/assets/videos/tab-manager-v2-feature-promo.mp4'],
    [scale, 'docs/assets/videos/tab-manager-v2-1024-tabs-scale-demo.mp4'],
    [suite, 'docs/assets/videos/tab-manager-v2-integration-test-suite.mp4'],
    [captions, 'docs/assets/tracks/tab-manager-v2-feature-promo.vtt'],
  ])
    cpSync(source, join(root, target))

  for (const name of ['feature-promo-source.png', 'scale-demo-source.png'])
    cpSync(
      join(staging, name),
      join(root, 'packages/integration_test/assets/posters', name),
    )
  writeFileSync(homepagePath, homepage)
  writeFileSync(
    join(root, 'packages/integration_test/assets/public-media-provenance.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        features: featureProof,
        promo: promoProof,
        integrationSuite: suiteProof,
      },
      null,
      2,
    ) + '\n',
  )
} finally {
  rmSync(staging, { recursive: true, force: true })
}
