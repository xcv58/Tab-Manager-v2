/* global structuredClone */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath, URL } from 'node:url'
import { createHash } from 'node:crypto'
import * as captureSites from './capture-sites.mjs'
import {
  extensionBuild,
  hashFile,
  PROMO_CLIP_IDS,
  SCALE_CLIP_ID,
  reusableRecordings,
  suitePaths,
  validateFeatures,
  validatePromo,
  validateSuite,
} from './capture-provenance.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'tmv2-provenance-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const write = (path, value) => {
    const absolute = join(root, path)
    mkdirSync(join(absolute, '..'), { recursive: true })
    writeFileSync(
      absolute,
      typeof value === 'string' ? value : JSON.stringify(value),
    )
    return absolute
  }
  write('build/manifest.json', { version: '3.0.0' })
  write('build/popup.js', 'current UI')
  const identity = {
    ...extensionBuild(join(root, 'build')),
    catalogueSha256: 'fixtures',
  }
  const videoDirectory = join(root, '.tmp/video-captures/mp4')
  const recordings = [...PROMO_CLIP_IDS, SCALE_CLIP_ID].map((id) => {
    const path = write(`.tmp/video-captures/mp4/${id}.mp4`, `video ${id}`)
    return { id, ...identity, sha256: hashFile(path) }
  })
  const features = { ...identity, recordings }
  const promoPath = write(
    '.tmp/video-captures/promo/tab-manager-v2-feature-promo.mp4',
    'assembled promo',
  )
  const promo = {
    ...identity,
    inputClips: structuredClone(recordings.slice(0, 6)),
    sha256: hashFile(promoPath),
  }
  const suitePath = write(
    '.tmp/video-captures/mp4/tab-manager-v2-integration-test-suite.mp4',
    'complete suite video',
  )
  const testDirectory = join(root, 'packages/integration_test/test')
  const suite = {
    complete: true,
    failedFiles: [],
    finalDuration: 100,
    sha256: hashFile(suitePath),
    recordings: ['a.test.ts', 'b.test.ts'].map((file) => ({
      file,
      passed: true,
      testSha256: hashFile(
        write(`packages/integration_test/test/${file}`, `test ${file}`),
      ),
      clips: [`${file}.mp4`],
      clipHashes: [
        {
          name: `${file}.mp4`,
          rawSha256: 'a'.repeat(64),
          spedUpSha256: 'b'.repeat(64),
        },
      ],
    })),
  }
  return {
    root,
    write,
    identity,
    features,
    videoDirectory,
    promo,
    promoPath,
    suite,
    suitePath,
    testDirectory,
  }
}

test('unchanged clips can be reused; changed version, bytes, catalogue and legacy receipts cannot', (t) => {
  const f = fixture(t)
  assert.equal(
    reusableRecordings(f.features, f.identity, f.videoDirectory).length,
    7,
  )
  for (const changed of [
    { extensionVersion: '3.0.1' },
    { buildSha256: 'c'.repeat(64) },
    { catalogueSha256: 'new fixtures' },
  ])
    assert.deepEqual(
      reusableRecordings(
        f.features,
        { ...f.identity, ...changed },
        f.videoDirectory,
      ),
      [],
    )
  const legacy = {
    catalogueSha256: 'fixtures',
    recordings: f.features.recordings,
  }
  assert.deepEqual(reusableRecordings(legacy, f.identity, f.videoDirectory), [])
  f.write('build/popup.js', 'different UI')
  assert.notEqual(
    extensionBuild(join(f.root, 'build')).buildSha256,
    f.identity.buildSha256,
  )
  f.write('build/manifest.json', { version: '3.0.1' })
  assert.equal(extensionBuild(join(f.root, 'build')).extensionVersion, '3.0.1')
})

test('promo rejects mixed builds, missing inputs, duplicate IDs and tampered footage', (t) => {
  const f = fixture(t)
  const validate = () =>
    validatePromo(
      f.promo,
      f.features,
      'fixtures',
      f.videoDirectory,
      f.promoPath,
    )
  assert.doesNotThrow(validate)
  f.features.recordings[0].buildSha256 = 'd'.repeat(64)
  assert.throws(validate, /mixed-build/)
  f.features.recordings[0].buildSha256 = f.identity.buildSha256
  const removed = f.promo.inputClips.pop()
  assert.throws(validate, /required set/)
  f.promo.inputClips.push(removed)
  f.features.recordings.push(f.features.recordings[0])
  assert.throws(validate, /Duplicate/)
  f.features.recordings.pop()
  f.write(
    `.tmp/video-captures/mp4/${PROMO_CLIP_IDS[0]}.mp4`,
    'replacement clip',
  )
  assert.throws(validate, /feature clip/)
})

test('a valid new recording invalidates an older assembled promo even when its own hash matches', (t) => {
  const f = fixture(t)
  const path = f.write(
    `.tmp/video-captures/mp4/${PROMO_CLIP_IDS[0]}.mp4`,
    'new take',
  )
  f.features.recordings[0].sha256 = hashFile(path)
  assert.doesNotThrow(() =>
    validateFeatures(f.features, 'fixtures', f.videoDirectory, PROMO_CLIP_IDS),
  )
  assert.throws(
    () =>
      validatePromo(
        f.promo,
        f.features,
        'fixtures',
        f.videoDirectory,
        f.promoPath,
      ),
    /stale promo/,
  )
})

test('public suite requires all current tests, passing takes and the exact assembled output', (t) => {
  const f = fixture(t)
  const validate = () => validateSuite(f.suite, f.testDirectory, f.suitePath)
  assert.doesNotThrow(validate)
  for (const change of [
    (proof) => {
      proof.complete = false
    },
    (proof) => {
      proof.failedFiles = ['b.test.ts']
    },
    (proof) => {
      proof.recordings.pop()
    },
    (proof) => {
      proof.recordings[1] = proof.recordings[0]
    },
    (proof) => {
      proof.recordings[0].passed = false
    },
    (proof) => {
      proof.recordings[0].clips = []
    },
    (proof) => {
      proof.finalDuration = 0
    },
    (proof) => {
      proof.finalDuration = Infinity
    },
  ]) {
    const proof = structuredClone(f.suite)
    change(proof)
    assert.throws(() => validateSuite(proof, f.testDirectory, f.suitePath))
  }
  f.write(
    '.tmp/video-captures/mp4/tab-manager-v2-integration-test-suite.mp4',
    'short unrelated mp4',
  )
  assert.throws(validate, /matching final video/)
  f.suite.sha256 = hashFile(f.suitePath)
  f.write('packages/integration_test/test/a.test.ts', 'updated test')
  assert.throws(validate, /changed test source/)
})

test('partial runs have separate receipts and MP4s, preserving the complete suite', () => {
  const full = suitePaths('/capture', false)
  const partial = suitePaths('/capture', true)
  assert.notEqual(full.directory, partial.directory)
  assert.notEqual(full.video, partial.video)
})

for (const malformed of ['chapters', 'homepage'])
  test(`invalid ${malformed} metadata leaves all existing public assets untouched`, (t) => {
    const f = fixture(t)
    // Use the real catalogue so the script reaches its final metadata preflight.
    const { SAMPLE_SITES } = captureSites
    const catalogueSha256 = createHash('sha256')
      .update(JSON.stringify(SAMPLE_SITES))
      .digest('hex')
    f.features.catalogueSha256 = catalogueSha256
    f.promo.catalogueSha256 = catalogueSha256
    for (const entry of [...f.features.recordings, ...f.promo.inputClips])
      entry.catalogueSha256 = catalogueSha256
    const chapters = f.write(
      '.tmp/video-captures/promo/chapters.json',
      malformed === 'chapters'
        ? []
        : PROMO_CLIP_IDS.map((id, index) => ({
            id,
            start: index + 1,
            end: index + 2,
          })),
    )
    const captions = f.write(
      '.tmp/video-captures/promo/captions.vtt',
      'WEBVTT\n',
    )
    f.write('.tmp/video-captures/capture-manifest.json', f.features)
    f.write('.tmp/video-captures/promo/provenance.json', {
      ...f.promo,
      chaptersSha256: hashFile(chapters),
      captionsSha256: hashFile(captions),
    })
    f.write(
      '.tmp/video-captures/integration-test-suite/recordings.json',
      f.suite,
    )
    const publicPath = f.write(
      'docs/assets/videos/tab-manager-v2-feature-promo.mp4',
      'approved public video',
    )
    const poster = f.write(
      'packages/integration_test/assets/posters/feature-promo-source.png',
      'approved poster',
    )
    const homepage = f.write('docs/index.html', 'approved homepage')
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(
          new URL('./sync-public-capture-media.mjs', import.meta.url),
        ),
      ],
      {
        env: { ...process.env, CAPTURE_ROOT_DIR: f.root },
        encoding: 'utf8',
      },
    )
    assert.notEqual(result.status, 0)
    assert.match(
      result.stderr,
      malformed === 'chapters'
        ? /Invalid promo chapters/
        : /Website chapter buttons do not match/,
    )
    assert.equal(readFileSync(publicPath, 'utf8'), 'approved public video')
    assert.equal(readFileSync(poster, 'utf8'), 'approved poster')
    assert.equal(readFileSync(homepage, 'utf8'), 'approved homepage')
  })
