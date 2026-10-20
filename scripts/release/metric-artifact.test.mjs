import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { URL } from 'node:url'
import { readMetricArtifact, readBenchmarkSource } from './metric-artifact.mjs'
import { freezeBenchmarkSource } from '../performance/sources.mjs'
import { git } from '../performance/records.mjs'

const historical = await readFile(
  new URL(
    '../../notes/performance/runs/2026-10-20-macos-c2dea3aa.json',
    import.meta.url,
  ),
)
const run = { id: 123, run_attempt: 2, head_sha: 'a'.repeat(40) }
const record = JSON.parse(historical)
record.id = 'runtime-123-2-candidate'
record.provenance.workflowRun = String(run.id)
const fresh = Buffer.from(JSON.stringify(record) + '\n\n')
const artifact = (kind) => ({ name: `performance-${kind}-123-2` })
async function directory(t) {
  const path = await mkdtemp(join(tmpdir(), 'release-metric-'))
  t.after(() => rm(path, { recursive: true, force: true }))
  return path
}

test('runtime artifacts import only runs/, ignoring historical viewer copies and preserving bytes', async (t) => {
  const path = await directory(t)
  await mkdir(join(path, 'runs'))
  await mkdir(join(path, 'viewer', 'records'), { recursive: true })
  await writeFile(join(path, 'runs', 'candidate.json'), fresh)
  await writeFile(
    join(path, 'viewer', 'records', 'historical.json'),
    historical,
  )
  await writeFile(join(path, 'viewer', 'snapshot.json'), '{ "records": [] }')
  const records = await readMetricArtifact(
    path,
    artifact('runtime'),
    run,
    record.source.commit,
  )
  assert.deepEqual(
    records.map(({ value }) => value.id),
    [record.id],
  )
  assert.deepEqual(records[0].bytes, fresh)
})

test('bundle artifacts import flat root records', async (t) => {
  const path = await directory(t)
  const bundle = { ...record, runtime: null }
  const bytes = Buffer.from(JSON.stringify(bundle))
  await writeFile(join(path, 'candidate.json'), bytes)
  const records = await readMetricArtifact(
    path,
    artifact('bundle'),
    run,
    record.source.commit,
  )
  assert.deepEqual(records[0].bytes, bytes)
  assert.equal(records[0].value.runtime, null)
})

for (const [name, mutate] of [
  [
    'another workflow run',
    (value) => {
      value.provenance.workflowRun = '999'
    },
  ],
  [
    'a dirty source',
    (value) => {
      value.source.dirty = true
    },
  ],
]) {
  test(`fresh records from ${name} still fail provenance checks`, async (t) => {
    const path = await directory(t)
    await mkdir(join(path, 'runs'))
    const value = JSON.parse(fresh)
    mutate(value)
    await writeFile(join(path, 'runs', 'candidate.json'), JSON.stringify(value))
    await assert.rejects(
      readMetricArtifact(path, artifact('runtime'), run, record.source.commit),
      /invalid metric provenance/,
    )
  })
}

test('historical viewer data cannot stand in for missing fresh records or a different source', async (t) => {
  const path = await directory(t)
  await mkdir(join(path, 'viewer', 'records'), { recursive: true })
  await writeFile(
    join(path, 'viewer', 'records', 'historical.json'),
    historical,
  )
  await assert.rejects(
    readMetricArtifact(path, artifact('runtime'), run, record.source.commit),
    /ENOENT/,
  )
  await mkdir(join(path, 'runs'))
  await writeFile(join(path, 'runs', 'candidate.json'), fresh)
  await assert.rejects(
    readMetricArtifact(path, artifact('runtime'), run, 'a'.repeat(40)),
    /does not include the release source/,
  )
  await assert.rejects(
    readMetricArtifact(
      path,
      { name: 'performance-runtime-123-1' },
      run,
      record.source.commit,
    ),
    /unexpected metric artifact identity/,
  )
})

const sourceReceipt = {
  schemaVersion: 1,
  kind: 'benchmark-source',
  repository: 'xcv58/Tab-Manager-v2',
  runId: String(run.id),
  attempt: run.run_attempt,
  controllerCommit: run.head_sha,
  source: {
    target: record.source.commit,
    baseline: 'b'.repeat(40),
    reference: 'c'.repeat(40),
  },
}
const sourceArtifact = { name: 'performance-source-123-2' }

test('a frozen source receipt identifies a failed run without measurement records and preserves bytes', async (t) => {
  const path = await directory(t)
  const bytes = Buffer.from(JSON.stringify(sourceReceipt) + '\n\n')
  await writeFile(join(path, 'benchmark-source.json'), bytes)
  const source = await readBenchmarkSource(
    path,
    sourceArtifact,
    { ...run, status: 'completed', conclusion: 'failure' },
    record.source.commit,
  )
  assert.deepEqual(source.bytes, bytes)
  assert.equal(source.value.source.target, record.source.commit)
})

for (const [name, mutate, pattern] of [
  [
    'another target with the release only as baseline',
    (value) => {
      value.source.baseline = value.source.target
      value.source.target = 'd'.repeat(40)
    },
    /target does not match/,
  ],
  [
    'another run',
    (value) => {
      value.runId = '999'
    },
    /run\/attempt identity/,
  ],
  [
    'an earlier attempt',
    (value) => {
      value.attempt = 1
    },
    /run\/attempt identity/,
  ],
  [
    'another controller',
    (value) => {
      value.controllerCommit = 'd'.repeat(40)
    },
    /run\/attempt identity/,
  ],
  [
    'an unrecognized repository',
    (value) => {
      value.repository = 'someone/else'
    },
    /invalid benchmark source/,
  ],
  [
    'an unresolved ref',
    (value) => {
      value.source.target = 'master'
    },
    /invalid benchmark source/,
  ],
]) {
  test(`source receipts from ${name} cannot attribute outcomes to this release`, async (t) => {
    const path = await directory(t)
    const value = JSON.parse(JSON.stringify(sourceReceipt))
    mutate(value)
    await writeFile(join(path, 'benchmark-source.json'), JSON.stringify(value))
    await assert.rejects(
      readBenchmarkSource(path, sourceArtifact, run, record.source.commit),
      pattern,
    )
  })
}

test('missing or malformed receipts and stale source artifacts fail validation', async (t) => {
  const path = await directory(t)
  await assert.rejects(
    readBenchmarkSource(path, sourceArtifact, run, record.source.commit),
    /ENOENT/,
  )
  await writeFile(join(path, 'benchmark-source.json'), '{')
  await assert.rejects(
    readBenchmarkSource(path, sourceArtifact, run, record.source.commit),
    SyntaxError,
  )
  await writeFile(
    join(path, 'benchmark-source.json'),
    JSON.stringify(sourceReceipt),
  )
  await assert.rejects(
    readBenchmarkSource(
      path,
      { name: 'performance-source-123-1' },
      run,
      record.source.commit,
    ),
    /unexpected benchmark source artifact/,
  )
})

test('freezing source refs records immutable commits before benchmark setup', () => {
  const head = git(['rev-parse', 'HEAD'])
  const receipt = freezeBenchmarkSource(
    { head: 'HEAD', base: 'HEAD', reference: 'HEAD' },
    { ...run, head_sha: head },
  )
  assert.deepEqual(receipt.source, {
    target: head,
    baseline: head,
    reference: head,
  })
  assert.equal(receipt.controllerCommit, head)
  assert.equal(receipt.runId, String(run.id))
  assert.equal(receipt.attempt, run.run_attempt)
})
