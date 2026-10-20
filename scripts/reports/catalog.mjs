import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  readRecords,
  sha256,
  json,
  validateRecord,
  repositoryRoot,
} from '../performance/records.mjs'

export const repository = 'xcv58/Tab-Manager-v2'
const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/
const commitPattern = /^[a-f0-9]{40}$/
const conclusions = new Set([
  'success',
  'failure',
  'cancelled',
  'skipped',
  'timed_out',
  'action_required',
  'neutral',
  'stale',
  'missing',
  'pending',
])
export function assert(condition, message) {
  if (!condition) throw new Error(`Release reports: ${message}`)
}
export function validateManifest(report) {
  assert(
    report?.schemaVersion === 1 && report.kind === 'release-report',
    'unsupported report manifest',
  )
  assert(
    namePattern.test(report.id) &&
      Number.isFinite(Date.parse(report.recordedAt)),
    'invalid report identity',
  )
  assert(
    commitPattern.test(report.source?.commit) &&
      /^v\d+\.\d+\.\d+$/.test(report.source?.tag) &&
      report.source.tag === `v${report.source.version}`,
    'invalid release identity',
  )
  assert(
    report.publisher?.repository === repository &&
      ['publish-release.yml'].includes(report.publisher.workflow),
    'unrecognized publisher',
  )
  assert(
    commitPattern.test(report.publisher.commit) &&
      /^\d+$/.test(String(report.publisher.runId)) &&
      /^\d+$/.test(String(report.publisher.attempt)),
    'invalid publisher provenance',
  )
  assert(
    Array.isArray(report.files) && report.files.length > 0,
    'empty file inventory',
  )
  const names = new Set()
  for (const file of report.files) {
    assert(
      namePattern.test(file.name) && !names.has(file.name),
      'unsafe or duplicate asset name',
    )
    names.add(file.name)
    assert(
      ['metric', 'checks', 'evidence', 'publisher'].includes(file.kind) &&
        /^[a-f0-9]{64}$/.test(file.sha256) &&
        Number.isSafeInteger(file.bytes) &&
        file.bytes > 0 &&
        file.bytes <= 100_000_000,
      'invalid asset inventory',
    )
  }
  assert(
    report.files.filter((file) => file.kind === 'checks').length === 1,
    'one checks file is required',
  )
  assert(
    report.files.filter((file) => file.kind === 'publisher').length === 1,
    'one publisher receipt is required',
  )
  if (report.submissions !== undefined) {
    assert(Array.isArray(report.submissions), 'invalid store submissions')
    const stores = new Set()
    for (const item of report.submissions) {
      assert(
        ['chrome', 'firefox', 'edge'].includes(item.store) &&
          !stores.has(item.store) &&
          ['submitted', 'unknown'].includes(item.state) &&
          /^\d+$/.test(String(item.runId)) &&
          Number.isFinite(Date.parse(item.recordedAt)),
        'invalid store receipt summary',
      )
      stores.add(item.store)
    }
  }
  return report
}
export function validateChecks(value, report) {
  assert(
    value?.schemaVersion === 1 &&
      value.commit === report.source.commit &&
      Array.isArray(value.checks),
    'checks do not match release',
  )
  const ids = new Set()
  for (const check of value.checks) {
    assert(
      namePattern.test(check.id) && !ids.has(check.id),
      'duplicate or unsafe check ID',
    )
    ids.add(check.id)
    assert(
      ['test', 'build', 'lint', 'workflow'].includes(check.kind) &&
        conclusions.has(check.conclusion),
      'unknown check type or conclusion',
    )
    assert(
      typeof check.name === 'string' &&
        check.name.length <= 240 &&
        typeof check.environment === 'string' &&
        check.environment.length <= 240,
      'invalid check label',
    )
    assert(
      check.counts === null ||
        ['passed', 'failed', 'skipped', 'flaky'].every(
          (key) =>
            Number.isSafeInteger(check.counts?.[key]) && check.counts[key] >= 0,
        ),
      'invalid test counts',
    )
    assert(
      typeof check.url === 'string' &&
        /^https:\/\/github\.com\/xcv58\/Tab-Manager-v2\/actions\/runs\/\d+(?:\/job\/\d+)?$/.test(
          check.url,
        ),
      'invalid check evidence URL',
    )
  }
  return value
}

// This module is deliberately offline: both Vercel and local builds read Git.
export const catalogPath = join(
  repositoryRoot,
  'notes/release-reports/catalog.json',
)
export const reportsDirectory = join(
  repositoryRoot,
  'notes/release-reports/reports',
)
export async function loadCatalog() {
  const history = JSON.parse(
    await readFile(
      join(repositoryRoot, 'notes/release-reports/history.json'),
      'utf8',
    ),
  )
  assert(
    history.schemaVersion === 1 && history.records.length === 19,
    'invalid frozen history receipt',
  )
  for (const file of history.records) {
    assert(
      namePattern.test(file.name) && file.name.endsWith('.json'),
      'unsafe historical record',
    )
    const bytes = await readFile(
      join(repositoryRoot, 'notes/performance/runs', file.name),
    )
    assert(
      bytes.length === file.bytes && sha256(bytes) === file.sha256,
      `historical bytes changed: ${file.name}`,
    )
  }
  const index = JSON.parse(await readFile(catalogPath, 'utf8'))
  assert(
    index.schemaVersion === 1 &&
      index.repository === repository &&
      Array.isArray(index.inventory) &&
      Array.isArray(index.reports),
    'invalid Git catalog',
  )
  const tags = new Set()
  for (const release of index.inventory) {
    assert(
      commitPattern.test(release.commit) &&
        /^\d+\.\d+\.\d+$/.test(release.version) &&
        release.tag === `v${release.version}` &&
        !tags.has(release.tag) &&
        Number.isFinite(Date.parse(release.releasedAt)) &&
        release.url ===
          `https://github.com/${repository}/releases/tag/${release.tag}`,
      'invalid or duplicate release inventory',
    )
    tags.add(release.tag)
  }
  const records = (await readRecords()).filter((record) => !record.source.dirty)
  const byId = new Map(records.map((record) => [record.id, record]))
  const reports = []
  const ids = new Set()
  for (const name of index.reports) {
    assert(
      namePattern.test(name) && name.endsWith('.json') && !ids.has(name),
      'unsafe or duplicate report path',
    )
    ids.add(name)
    const report = validateManifest(
      JSON.parse(await readFile(join(reportsDirectory, name), 'utf8')),
    )
    validateChecks(
      { schemaVersion: 1, commit: report.source.commit, checks: report.checks },
      report,
    )
    const release = index.inventory.find(
      (item) => item.tag === report.source.tag,
    )
    assert(
      release?.commit === report.source.commit,
      'report does not match release inventory',
    )
    assert(Array.isArray(report.recordIds), 'missing measurement inventory')
    for (const id of report.recordIds)
      assert(byId.has(id), `missing metric record ${id}`)
    for (const file of report.files) {
      assert(
        file.url ===
          `https://github.com/${repository}/releases/download/${report.source.tag}/${file.name}`,
        'invalid evidence link',
      )
      if (file.kind === 'metric') {
        const metric = report.metrics?.find((item) => item.name === file.name)
        assert(metric && byId.has(metric.id), 'missing metric identity')
        const bytes = await readFile(
          join(repositoryRoot, 'notes/performance/runs', `${metric.id}.json`),
        )
        validateRecord(JSON.parse(bytes))
        assert(
          bytes.length === file.bytes && sha256(bytes) === file.sha256,
          `changed metric ${metric.id}`,
        )
      }
    }
    reports.push(report)
  }
  const catalog = {
    schemaVersion: 1,
    repository,
    inventory: index.inventory,
    reports,
    records,
  }
  catalog.digest = sha256(
    json({ inventory: catalog.inventory, reports, records }),
  )
  return catalog
}
if (process.argv[1] === import.meta.filename) {
  const catalog = await loadCatalog()
  if (process.argv[2]) await writeFile(process.argv[2], json(catalog))
  process.stdout.write(
    `Validated ${catalog.inventory.length} published releases, ${catalog.records.length} records, ${catalog.reports.length} reports; ${catalog.digest}\n`,
  )
}
