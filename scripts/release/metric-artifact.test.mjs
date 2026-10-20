import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { URL } from 'node:url'
import { readMetricArtifact } from './metric-artifact.mjs'

const historical = await readFile(
  new URL(
    '../../notes/performance/runs/2026-10-20-macos-c2dea3aa.json',
    import.meta.url,
  ),
)
const run = { id: 123, run_attempt: 2 }
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
