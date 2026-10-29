import test from 'node:test'
import assert from 'node:assert/strict'
import { nextBuildNumber } from './safari-api.mjs'
import {
  safari,
  safariFiles,
  safariUploadDecision,
  safariSummary,
} from './safari-model.mjs'
import {
  validateCandidate,
  candidateJobs,
  assertRequiredJobs,
  packageNames,
} from './candidate.mjs'
import {
  assertReviewedListing,
  processedBuild,
  versionSnapshot,
} from './safari-store.mjs'

const receipt = (phase, details = {}) => ({
  receipt: { phase, details, runId: '1', recordedAt: '2026-10-28T01:00:00Z' },
})
const upload = (state = 'PROCESSING') => ({
  attributes: {
    cfBundleVersion: '42',
    cfBundleShortVersionString: '3.0.2',
    state: { state },
  },
})
const decision = (values = {}) =>
  safariUploadDecision({
    build: null,
    uploads: [],
    receipts: [],
    reconciled: false,
    version: '3.0.2',
    ...values,
  })

test('allocation includes manual/pending uploads and durable reservations across versions', () => {
  assert.equal(
    nextBuildNumber(
      [{ attributes: { version: '21' } }, { attributes: { version: '100' } }],
      [{ attributes: { cfBundleVersion: '101' } }],
      [{ buildNumber: '104' }],
    ),
    '105',
  )
  assert.throws(
    () => nextBuildNumber([{ attributes: { version: '2.1' } }], [], []),
    /Reconcile/,
  )
})
test('uncertain uploads need reconciliation, recorded Apple builds resume', () => {
  assert.equal(decision(), 'upload')
  assert.throws(
    () => decision({ receipts: [receipt('upload-started')] }),
    /uncertain/,
  )
  assert.throws(() => decision({ receipts: [receipt('unknown')] }), /uncertain/)
  assert.equal(
    decision({ receipts: [receipt('upload-started')], reconciled: true }),
    'upload',
  )
  for (const phase of ['upload-started', 'upload-accepted']) {
    for (const observed of [
      { uploads: [upload()] },
      { build: { id: 'unrecorded-build' } },
    ]) {
      assert.throws(
        () => decision({ receipts: [receipt(phase)], ...observed }),
        /no Apple build ID was recorded/,
      )
      assert.equal(
        decision({ receipts: [receipt(phase)], ...observed, reconciled: true }),
        'resume',
      )
    }
  }
  assert.equal(
    decision({
      receipts: [receipt('processed', { buildId: 'apple-42' })],
      build: { id: 'apple-42' },
    }),
    'resume',
  )
  assert.throws(
    () => decision({ uploads: [upload()] }),
    /without an upload receipt/,
  )
  assert.throws(
    () =>
      decision({
        receipts: [receipt('processed', { buildId: 'other' })],
        build: { id: 'apple-42' },
      }),
    /differs/,
  )
  assert.throws(
    () =>
      decision({
        receipts: [receipt('upload-started')],
        uploads: [upload('FAILED')],
        reconciled: true,
      }),
    /failed/,
  )
  assert.throws(
    () =>
      decision({
        receipts: [receipt('processed', { buildId: 'other' })],
        build: { id: 'apple-42' },
        reconciled: true,
      }),
    /differs/,
  )
})
test('processing cannot adopt a different build that appears after the initial query', async () => {
  const apple = {
    list: async () => [
      {
        id: 'different-build',
        attributes: { processingState: 'VALID', expired: false },
      },
    ],
    api: async () => ({
      data: { attributes: { platform: 'MAC_OS', version: '3.0.2' } },
    }),
  }
  const candidate = {
    source: { version: '3.0.2' },
    safari: { buildNumber: '42' },
  }
  await assert.rejects(
    processedBuild(
      apple,
      candidate,
      async () => assert.fail('Must not checkpoint an unrelated build'),
      ['recorded-build'],
    ),
    /differs from archived receipt/,
  )
})
const nativeCandidate = () => ({
  schemaVersion: 2,
  kind: 'release-candidate',
  source: { commit: 'a'.repeat(40), version: '3.0.2', tag: 'v3.0.2' },
  build: { runId: '123', attempt: 1, controllerCommit: 'a'.repeat(40) },
  files: [...packageNames, ...safariFiles].map((name) => ({
    name,
    bytes: 42,
    sha256: 'b'.repeat(64),
  })),
  safari: {
    ...safari,
    commit: 'a'.repeat(40),
    version: '3.0.2',
    buildNumber: '42',
    runId: '123',
    attempt: 1,
    architectures: ['arm64', 'x86_64'],
    toolchain: {
      xcode: safari.xcode,
      xcodeBuild: safari.xcodeBuild,
      xcodegen: safari.xcodegen,
      runner: 'macos-15',
    },
    webResourcesSha256: 'c'.repeat(64),
    whatsNew: { 'en-US': 'Reviewed Safari changes.' },
    signing: {
      applicationCertificate: 'A'.repeat(40),
      installerCertificate: 'B'.repeat(40),
      certificates: [
        { sha256: 'A'.repeat(64), expiresAt: '2027-10-28T00:00:00Z' },
        { sha256: 'B'.repeat(64), expiresAt: '2027-10-28T00:00:00Z' },
      ],
      profiles: [safari.bundleId, safari.extensionId].map((bundleId) => ({
        bundleId,
        uuid: '11111111-1111-1111-1111-111111111111',
        expiresAt: '2027-10-28T00:00:00Z',
      })),
    },
  },
})
test('Safari approval binds native package, attempt, source, identities and signing gates', () => {
  const candidate = nativeCandidate()
  assert.equal(validateCandidate(candidate), candidate)
  const jobs = candidateJobs(candidate).map((name) => ({
    name,
    conclusion: 'success',
  }))
  assert.doesNotThrow(() => assertRequiredJobs(jobs, candidate))
  assert.throws(
    () =>
      assertRequiredJobs(
        jobs.filter((j) => j.name !== 'Package Safari candidate'),
        candidate,
      ),
    /Package Safari/,
  )
  for (const mutate of [
    (c) => c.files.pop(),
    (c) => c.safari.attempt++,
    (c) => (c.safari.bundleId += 'other'),
    (c) => (c.safari.commit = 'd'.repeat(40)),
    (c) => (c.safari.version = '3.0.3'),
    (c) => (c.safari.architectures = ['arm64']),
    (c) => (c.safari.toolchain.xcode = 'latest'),
  ]) {
    const changed = JSON.parse(JSON.stringify(candidate))
    mutate(changed)
    assert.throws(() => validateCandidate(changed))
  }
  const legacy = {
    ...candidate,
    schemaVersion: 1,
    files: candidate.files.slice(0, 3),
  }
  delete legacy.safari
  assert.doesNotThrow(() => validateCandidate(legacy))
  assert(!candidateJobs(legacy).includes('Package Safari candidate'))
})
test('metadata approval survives review-state changes but detects listing/build changes', async () => {
  let state = 'PREPARE_FOR_SUBMISSION',
    text = 'Reviewed Safari changes.'
  let screenshot = 'image-checksum-1'
  const apple = {
    api: async (path) => ({
      data: path.endsWith('/appStoreReviewDetail')
        ? {
            attributes: {
              contactEmail: 'private@example.invalid',
              demoAccountPassword: 'never-publish',
            },
          }
        : path.endsWith('/build')
          ? { id: 'apple-42' }
          : {
              id: 'v-id',
              attributes: {
                platform: 'MAC_OS',
                versionString: '3.0.2',
                releaseType: 'MANUAL',
                appStoreState: state,
              },
            },
    }),
    list: async (path) =>
      path.includes('/appScreenshotSets?')
        ? [
            {
              id: 'set-id',
              attributes: { screenshotDisplayType: 'APP_DESKTOP' },
            },
          ]
        : path.includes('/appScreenshots?')
          ? [{ id: 'shot-id', attributes: { sourceFileChecksum: screenshot } }]
          : path.includes('/appStoreVersionLocalizations?')
            ? [
                {
                  id: 'locale-id',
                  attributes: {
                    locale: 'en-US',
                    whatsNew: text,
                    description: 'Existing listing',
                  },
                },
              ]
            : [],
  }
  const first = await versionSnapshot(apple, { id: 'v-id' })
  assert(!JSON.stringify(first).includes('never-publish'))
  assert(!JSON.stringify(first).includes('private@example.invalid'))
  assert.doesNotThrow(() =>
    assertReviewedListing(first.snapshot, nativeCandidate(), 'apple-42'),
  )
  assert.throws(
    () =>
      assertReviewedListing(
        first.snapshot,
        nativeCandidate(),
        'different-build',
      ),
    /differs/,
  )
  state = 'WAITING_FOR_REVIEW'
  assert.equal(
    (await versionSnapshot(apple, { id: 'v-id' })).digest,
    first.digest,
  )
  screenshot = 'changed-image'
  assert.notEqual(
    (await versionSnapshot(apple, { id: 'v-id' })).digest,
    first.digest,
  )
  screenshot = 'image-checksum-1'
  text = 'Unexpected edit'
  const changed = await versionSnapshot(apple, { id: 'v-id' })
  assert.notEqual(changed.digest, first.digest)
  assert.throws(
    () =>
      assertReviewedListing(changed.snapshot, nativeCandidate(), 'apple-42'),
    /notes differ/,
  )
})
test('Safari report keeps processing/tester/submission stages separate', () => {
  assert.equal(safariSummary([receipt('upload-accepted')]).state, 'uploaded')
  assert.equal(
    safariSummary([
      receipt('upload-accepted'),
      receipt('processed', { buildId: '42' }),
    ]).state,
    'processed',
  )
  assert.equal(
    safariSummary([receipt('processed'), receipt('testers-available')]).state,
    'testers-available',
  )
  assert.equal(
    safariSummary([
      receipt('testers-available'),
      receipt('app-store-submitted'),
    ]).state,
    'submitted',
  )
})
