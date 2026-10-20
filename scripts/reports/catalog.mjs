import { readFile, writeFile } from 'node:fs/promises'
import {
  readRecords,
  sha256,
  json,
  validateRecord,
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
      ['release-please.yml', 'refresh-release-reports.yml'].includes(
        report.publisher.workflow,
      ),
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
        check.url.startsWith(`https://github.com/${repository}/actions/runs/`),
      'invalid check evidence URL',
    )
  }
  return value
}

async function request(path, binary = false) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/${path}`,
    {
      headers: {
        Accept: binary
          ? 'application/octet-stream'
          : 'application/vnd.github+json',
        ...(process.env.GH_TOKEN
          ? { Authorization: `Bearer ${process.env.GH_TOKEN}` }
          : {}),
      },
      signal: AbortSignal.timeout(60_000),
    },
  )
  assert(response.ok, `GitHub ${response.status} for ${path}`)
  return binary ? Buffer.from(await response.arrayBuffer()) : response.json()
}
export async function pages(path) {
  const all = []
  for (let page = 1; ; page++) {
    const items = await request(
      `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
    )
    const values = Array.isArray(items)
      ? items
      : items.workflow_runs || items.artifacts || items.jobs
    assert(Array.isArray(values), 'invalid GitHub pagination response')
    all.push(...values)
    if (values.length < 100) return all
  }
}
export { request }

export async function githubCatalog() {
  const releases = (await pages('releases')).filter(
    (release) =>
      !release.draft &&
      !release.prerelease &&
      /^v\d+\.\d+\.\d+$/.test(release.tag_name) &&
      release.tag_name
        .slice(1)
        .split('.')
        .map(Number)
        .some((n, i, a) => (i === 0 ? n > 2 : i === 1 && a[0] === 2 && n >= 6)),
  )
  const records = [],
    reports = [],
    inventory = []
  for (const release of releases) {
    // Resolve the tag rather than trusting target_commitish (often a branch).
    const commit = (
      await request(`commits/${encodeURIComponent(release.tag_name)}`)
    ).sha
    inventory.push({
      commit,
      version: release.tag_name.slice(1),
      tag: release.tag_name,
      releasedAt: release.published_at,
      url: release.html_url,
    })
    const assets = await pages(`releases/${release.id}/assets`)
    for (const asset of assets.filter((item) =>
      /^release-report-.*\.manifest\.json$/.test(item.name),
    )) {
      assert(asset.size <= 1_000_000, 'oversized report manifest')
      const bytes = await request(`releases/assets/${asset.id}`, true)
      const report = validateManifest(JSON.parse(bytes))
      assert(
        report.source.commit === commit &&
          report.source.tag === release.tag_name &&
          asset.name === `${report.id}.manifest.json`,
        'report belongs to a different release',
      )
      assert(
        asset.uploader?.login === 'github-actions[bot]',
        'manifest was not uploaded by the trusted workflow token',
      )
      const reportRecords = []
      for (const file of report.files) {
        const attachment = assets.find((item) => item.name === file.name)
        assert(
          attachment && attachment.size === file.bytes,
          `missing or changed asset ${file.name}`,
        )
        // Diagnostic ZIPs are downloadable evidence; metrics/checks are the data input.
        // Their API digest is checked when available; publisher verifies every byte.
        if (file.kind === 'evidence') {
          if (attachment.digest)
            assert(
              attachment.digest === `sha256:${file.sha256}`,
              `evidence digest mismatch ${file.name}`,
            )
          else {
            const evidence = await request(
              `releases/assets/${attachment.id}`,
              true,
            )
            assert(
              evidence.length === file.bytes &&
                sha256(evidence) === file.sha256,
              `evidence checksum mismatch ${file.name}`,
            )
          }
          file.url = attachment.browser_download_url
          continue
        }
        const content = await request(`releases/assets/${attachment.id}`, true)
        assert(
          content.length === file.bytes && sha256(content) === file.sha256,
          `checksum mismatch ${file.name}`,
        )
        const value = JSON.parse(content)
        if (file.kind === 'metric') {
          validateRecord(value)
          assert(!value.source.dirty, 'dirty release measurement')
          if (value.source.commit === report.source.commit)
            assert(
              value.source.version === report.source.version,
              'measurement version disagrees with release',
            )
          reportRecords.push(value)
        } else if (file.kind === 'checks')
          report.checks = validateChecks(value, report).checks
        else {
          // The receipt survives Actions retention/deletion. Site builds depend
          // on release assets, never on the continued existence of a CI run.
          const publisher = value.run
          assert(
            publisher?.head_sha === report.publisher.commit &&
              publisher.head_branch === 'master' &&
              ['push', 'workflow_dispatch'].includes(publisher.event) &&
              publisher.path ===
                `.github/workflows/${report.publisher.workflow}` &&
              String(publisher.id) === String(report.publisher.runId) &&
              Number(publisher.run_attempt) ===
                Number(report.publisher.attempt),
            'publisher receipt does not match manifest',
          )
        }
        file.url = attachment.browser_download_url
      }
      report.url = asset.browser_download_url
      report.recordIds = reportRecords.map((record) => record.id)
      reports.push(report)
      records.push(...reportRecords)
    }
  }
  return {
    schemaVersion: 1,
    repository,
    fetchedAt: new Date().toISOString(),
    inventory,
    reports,
    records,
  }
}

export async function loadCatalog({
  snapshot = process.env.REPORTS_SNAPSHOT,
  remote = false,
} = {}) {
  const seed = (await readRecords()).filter((record) => !record.source.dirty)
  const external = snapshot
    ? JSON.parse(await readFile(snapshot, 'utf8'))
    : remote
      ? await githubCatalog()
      : {
          schemaVersion: 1,
          repository,
          inventory: [],
          reports: [],
          records: [],
        }
  assert(
    external.schemaVersion === 1 &&
      external.repository === repository &&
      Array.isArray(external.inventory) &&
      Array.isArray(external.records) &&
      Array.isArray(external.reports),
    'invalid catalog snapshot',
  )
  for (const report of external.reports) {
    validateManifest(report)
    validateChecks(
      { schemaVersion: 1, commit: report.source.commit, checks: report.checks },
      report,
    )
  }
  for (const release of external.inventory)
    assert(
      commitPattern.test(release.commit) &&
        /^\d+\.\d+\.\d+$/.test(release.version) &&
        release.tag === `v${release.version}` &&
        Number.isFinite(Date.parse(release.releasedAt)),
      'invalid release inventory',
    )
  const records = new Map()
  for (const record of [...seed, ...external.records]) {
    validateRecord(record)
    assert(
      !records.has(record.id) || json(records.get(record.id)) === json(record),
      `conflicting record ${record.id}`,
    )
    records.set(record.id, record)
  }
  const catalog = { ...external, records: [...records.values()] }
  catalog.digest = sha256(
    json({
      inventory: catalog.inventory,
      reports: catalog.reports,
      records: catalog.records,
    }),
  )
  if (external.digest)
    assert(
      external.digest === catalog.digest,
      'catalog snapshot digest mismatch',
    )
  return catalog
}

if (process.argv[1] === import.meta.filename) {
  const output = process.argv[2]
  assert(output, 'usage: node scripts/reports/catalog.mjs OUTPUT.json')
  const catalog = await loadCatalog({ remote: true })
  await writeFile(output, json(catalog))
  process.stdout.write(
    `Saved ${catalog.inventory.length} releases, ${catalog.records.length} records, ${catalog.reports.length} reports; ${catalog.digest}\n`,
  )
}
