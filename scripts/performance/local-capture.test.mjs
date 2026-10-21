import test from 'node:test'
import { URL } from 'node:url'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { json, sha256, runtimeCompatibilityKey } from './records.mjs'
import {
  profileIdentity,
  assertLocalMeasurement,
  assertProfileHost,
  withMeasurementLock,
} from './environment.mjs'
import {
  readLocalCapture,
  validateLocalCapture,
  readCommittedLocalCaptures,
} from './local-capture.mjs'

const profile = JSON.parse(
  await readFile(
    new URL('../../notes/performance/protocol.json', import.meta.url),
  ),
)
const runtimeFixture = JSON.parse(
  await readFile(
    new URL(
      '../../notes/performance/runs/release-runtime-history-2026-10-20-c2dea3aa.json',
      import.meta.url,
    ),
  ),
)
const bundleFixture = JSON.parse(
  await readFile(
    new URL(
      '../../notes/performance/runs/2026-10-20-macos-c2dea3aa.json',
      import.meta.url,
    ),
  ),
)
const target = 'a'.repeat(40),
  baseline = profile.reference
async function fixture(t, mutate = () => {}) {
  const root = await mkdtemp(join(tmpdir(), 'local-performance-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const candidate = {
    schemaVersion: 1,
    kind: 'release-candidate',
    source: { commit: target, version: '3.0.1', tag: 'v3.0.1' },
    build: { runId: '123', attempt: 1, controllerCommit: target },
    files: bundleFixture.bundles.map((bundle) => ({
      name: `build_${bundle.browser}.zip`,
      bytes: bundle.zip.bytes,
      sha256: bundle.zip.sha256,
    })),
  }
  candidate.files.push({
    name: 'build_firefox_source.zip',
    bytes: 1,
    sha256: 'f'.repeat(64),
  })
  const records = []
  const bundle = globalThis.structuredClone(bundleFixture)
  bundle.id = 'capture-bundles'
  bundle.source = {
    ...candidate.source,
    label: '3.0.1',
    status: 'released',
    dirty: false,
    committedAt: '2026-10-21T00:00:00Z',
  }
  bundle.runtime = null
  bundle.provenance.workflowRun = null
  records.push(bundle)
  for (const commit of [target, baseline]) {
    const value = globalThis.structuredClone(runtimeFixture)
    value.id = `capture-${commit.slice(0, 8)}`
    value.source.commit = commit
    value.source.version = commit === target ? '3.0.1' : '3.0.0'
    value.provenance.workflowRun = null
    Object.assign(value.runtime.environment, profileIdentity(profile))
    value.runtime.compatibilityKey = runtimeCompatibilityKey(
      value.runtime.environment,
      value.provenance.harness,
      value.runtime.fixtureFingerprints,
    )
    value.comparisonBaseline = { commit: baseline, referenceCommit: baseline }
    for (const sample of value.runtime.samples)
      sample.startup.build.revision = commit
    records.push(value)
  }
  const condition = {
    recordedAt: '2026-10-21T00:00:00Z',
    acPower: true,
    loadAverage: [1, 1, 1],
    freeMemoryBytes: 1000,
  }
  const capture = {
    schemaVersion: 1,
    kind: 'local-release-performance',
    id: 'capture',
    recordedAt: '2026-10-21T00:00:00Z',
    candidate,
    candidateSha256: sha256(json(candidate)),
    collectorCommit: 'b'.repeat(40),
    profile,
    baselineCommit: baseline,
    referenceCommit: baseline,
    conditions: { before: condition, after: condition },
    files: [],
  }
  mutate({ capture, records })
  const directory = join(root, 'runs')
  await mkdir(directory)
  for (const record of records) {
    const bytes = Buffer.from(json(record)),
      name = `${record.id}.json`
    await writeFile(join(directory, name), bytes)
    capture.files.push({ name, bytes: bytes.length, sha256: sha256(bytes) })
  }
  const path = join(root, 'capture.json')
  await writeFile(path, json(capture))
  return { root, path, directory, capture, candidate, records }
}

test('complete paired local capture binds exact packages and preserves original record bytes', async (t) => {
  const f = await fixture(t)
  const result = await readLocalCapture(f.path, f.directory, {
    candidate: f.candidate,
    digest: f.capture.candidateSha256,
  })
  assert.equal(result.records.length, 3)
  assert.deepEqual(
    result.records[0].bytes,
    await readFile(join(f.directory, 'capture-bundles.json')),
  )
})

test('changed raw samples fail their manifest checksum', async (t) => {
  const f = await fixture(t)
  await writeFile(join(f.directory, 'capture-bundles.json'), '{}')
  await assert.rejects(readLocalCapture(f.path, f.directory), /record changed/)
})

test('a capture cannot be attached to another reviewed package identity', async (t) => {
  const f = await fixture(t)
  const candidate = globalThis.structuredClone(f.candidate)
  candidate.files[0].sha256 = '0'.repeat(64)
  assert.throws(
    () => validateLocalCapture(f.capture, candidate, f.capture.candidateSha256),
    /reviewed candidate/,
  )
})

for (const [name, mutate, error] of [
  [
    'incomplete comparison',
    ({ records }) => records.pop(),
    /inventory|incomplete/,
  ],
  [
    'different package',
    ({ records }) => (records[0].bundles[0].zip.sha256 = '0'.repeat(64)),
    /frozen package/,
  ],
  [
    'CI provenance',
    ({ records }) => (records[1].provenance.workflowRun = '123'),
    /local record provenance/,
  ],
  [
    'dirty source',
    ({ records }) => (records[1].source.dirty = true),
    /local record provenance/,
  ],
  [
    'different machine',
    ({ records }) => (records[1].runtime.environment.machineId = 'other'),
    /local protocol/,
  ],
  [
    'different browser',
    ({ records }) => {
      const v = records[1]
      v.runtime.environment.browser = 'different'
      v.runtime.compatibilityKey = runtimeCompatibilityKey(
        v.runtime.environment,
        v.provenance.harness,
        v.runtime.fixtureFingerprints,
      )
    },
    /not comparable/,
  ],
  [
    'partial samples',
    ({ records }) => records[1].runtime.samples.pop(),
    /partial runtime workload/,
  ],
  [
    'unlisted workloads',
    ({ records }) => {
      const extra = globalThis.structuredClone(
        records[1].runtime.samples.filter((sample) => sample.tabs === 100),
      )
      for (const sample of extra) {
        sample.tabs = 50
        sample.startup.tabCount = 62
        sample.search.Needle.matchedTabs = 4
        sample.search.Work.matchedTabs = 58
      }
      records[1].runtime.samples.push(...extra)
    },
    /local protocol/,
  ],
  [
    'battery interval',
    ({ capture }) =>
      (capture.conditions.after = {
        ...capture.conditions.after,
        acPower: false,
      }),
    /measurement conditions/,
  ],
])
  test(`rejects ${name}`, async (t) => {
    const f = await fixture(t, mutate)
    await assert.rejects(readLocalCapture(f.path, f.directory), error)
  })

test('unsafe record paths are rejected before reading outside the capture', async (t) => {
  const f = await fixture(t)
  f.capture.files[0].name = '../foreign.json'
  assert.throws(() => validateLocalCapture(f.capture), /unsafe/)
})

test('committed captures are validated before release archival', async (t) => {
  const f = await fixture(t),
    captures = join(f.root, 'notes/performance/captures'),
    runs = join(f.root, 'notes/performance/runs')
  await mkdir(captures, { recursive: true })
  await mkdir(runs)
  await writeFile(join(captures, 'capture.json'), json(f.capture))
  for (const file of f.capture.files)
    await writeFile(
      join(runs, file.name),
      await readFile(join(f.directory, file.name)),
    )
  const loaded = await readCommittedLocalCaptures({
    candidate: f.candidate,
    digest: f.capture.candidateSha256,
    root: f.root,
  })
  assert.equal(loaded.length, 1)
})

test('CI cannot measure, and changed toolchains require a new reviewed protocol', () => {
  assert.throws(
    () => assertLocalMeasurement({ GITHUB_ACTIONS: 'true' }),
    /local-only/,
  )
  assert.throws(
    () => assertProfileHost(profile, { ...profile, node: 'v0.0.0' }),
    /differs/,
  )
  assert.doesNotThrow(() => assertProfileHost(profile, profile))
})

test('all collection entrypoints reject CI before downloads or measurement', () => {
  for (const [script, ...args] of [
    ['cli.mjs', 'collect'],
    ['backfill.mjs'],
    ['release.mjs', '--tag', 'v3.0.1'],
  ]) {
    const result = spawnSync(
      process.execPath,
      [new URL(script, import.meta.url).pathname, ...args],
      {
        encoding: 'utf8',
        env: { ...process.env, CI: 'true' },
        timeout: 10000,
      },
    )
    assert.equal(result.status, 1, `${script}: ${result.stderr}`)
    assert.match(result.stderr, /measurements are local-only/)
  }
})

test('local measurement lock prevents overlap and is released after a failed capture', async (t) => {
  const f = await fixture(t),
    path = join(f.root, 'measurement.lock')
  await assert.rejects(
    withMeasurementLock(async () => {
      await assert.rejects(
        withMeasurementLock(async () => {}, path),
        /measurement lock/,
      )
      throw new Error('capture stopped')
    }, path),
    /capture stopped/,
  )
  await assert.doesNotReject(withMeasurementLock(async () => {}, path))
})
