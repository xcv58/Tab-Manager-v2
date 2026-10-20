import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { validateRecord } from '../performance/records.mjs'
import { assert, gh, pages, repository } from './github.mjs'
import { validateBenchmarkSource } from '../performance/sources.mjs'

export async function readBenchmarkSource(directory, artifact, run, commit) {
  assert(
    artifact.name === `performance-source-${run.id}-${run.run_attempt}`,
    'unexpected benchmark source artifact identity',
  )
  const bytes = await readFile(join(directory, 'benchmark-source.json'))
  return {
    bytes,
    value: validateBenchmarkSource(JSON.parse(bytes), run, commit),
  }
}

export async function loadBenchmarkSource(run, commit, output) {
  const artifact = (await pages(`actions/runs/${run.id}/artifacts`)).find(
    (item) =>
      item.name === `performance-source-${run.id}-${run.run_attempt}` &&
      !item.expired,
  )
  if (!artifact) return null
  const directory = join(output, `source-${artifact.id}`)
  gh([
    'run',
    'download',
    String(run.id),
    '--repo',
    repository,
    '--name',
    artifact.name,
    '--dir',
    directory,
  ])
  return readBenchmarkSource(directory, artifact, run, commit)
}

// Runtime artifacts also carry an offline viewer with historical records.
// Only runs/ is new evidence; bundle-only artifacts have a flat JSON root.
export async function readMetricArtifact(directory, artifact, run, commit) {
  const kind = ['bundle', 'runtime'].find(
    (kind) =>
      artifact.name === `performance-${kind}-${run.id}-${run.run_attempt}`,
  )
  assert(kind, 'unexpected metric artifact identity')
  const root = kind === 'runtime' ? join(directory, 'runs') : directory
  const records = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const bytes = await readFile(join(root, entry.name))
    const value = JSON.parse(bytes)
    validateRecord(value)
    assert(
      !value.source.dirty &&
        String(value.provenance.workflowRun) === String(run.id),
      'invalid metric provenance',
    )
    records.push({ bytes, value })
  }
  assert(
    records.some(({ value }) => value.source.commit === commit),
    'metric artifact does not include the release source',
  )
  return records
}
