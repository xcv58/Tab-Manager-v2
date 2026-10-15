// Promote completed, locally reviewed captures into the public asset tree.
// This only updates files in the checkout; it does not deploy or publish.
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { URL, fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { SAMPLE_SITES } from './capture-sites.mjs'

const root = fileURLToPath(new URL('../../..', import.meta.url))
const captures = join(root, '.tmp/video-captures')
const promo = join(captures, 'promo/tab-manager-v2-feature-promo.mp4')
const scale = join(captures, 'mp4/08-thousand-twenty-four-tabs-scale.mp4')
const suite = join(captures, 'mp4/tab-manager-v2-integration-test-suite.mp4')
const captions = join(captures, 'promo/captions.vtt')
for (const path of [promo, scale, suite, captions]) {
  if (!existsSync(path)) throw new Error(`Missing completed capture: ${path}`)
}
const hash = (path) =>
  createHash('sha256').update(readFileSync(path)).digest('hex')
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
if (
  featureProof.catalogueSha256 !== catalogueHash ||
  promoProof.catalogueSha256 !== catalogueHash ||
  promoProof.sha256 !== hash(promo)
)
  throw new Error(
    'The public videos must use the current local capture fixtures',
  )
const scaleProof = featureProof.recordings.find(
  (entry) => entry.id === '08-thousand-twenty-four-tabs-scale',
)
if (!scaleProof || scaleProof.sha256 !== hash(scale))
  throw new Error('Recapture the local 1,024-tab video first')
if (
  suiteProof.failedFiles.length ||
  suiteProof.recordings.some((entry) => !entry.passed) ||
  !suiteProof.finalDuration
)
  throw new Error(
    'Finish a passing integration-test recording before updating its public video',
  )

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
      join(root, 'packages/integration_test/assets/posters', name),
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

// Keep the public chapter buttons aligned when new takes change clip lengths.
const chapters = JSON.parse(
  readFileSync(join(captures, 'promo/chapters.json'), 'utf8'),
)
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
writeFileSync(homepagePath, homepage)
