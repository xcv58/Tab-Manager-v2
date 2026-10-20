// Explicit local import. Website builds never import this network-capable module.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  catalogPath,
  reportsDirectory,
  validateManifest,
  validateChecks,
  loadCatalog,
} from './catalog.mjs'
import {
  assert,
  gh,
  pages,
  request,
  repository,
  readJsonAsset,
} from '../release/github.mjs'
import { writeImmutable } from '../release/candidate.mjs'
import {
  archiveDirectory,
  json,
  sha256,
  validateRecord,
} from '../performance/records.mjs'

export async function readReportManifests(assets) {
  const reports = []
  for (const asset of assets.filter((asset) =>
    /^release-report-.*\.manifest\.json$/.test(asset.name),
  )) {
    const saved = await readJsonAsset(asset, 'report manifest')
    if (saved) reports.push({ asset, report: validateManifest(saved.value) })
  }
  return reports
}

export async function importRelease(tag) {
  assert(
    /^v\d+\.\d+\.\d+$/.test(tag || ''),
    'supply an existing stable release tag',
  )
  const release = await request(`releases/tags/${encodeURIComponent(tag)}`)
  assert(
    !release.draft && !release.prerelease,
    'only published stable releases may be imported',
  )
  const commit = (await request(`commits/${encodeURIComponent(tag)}`)).sha
  const assets = await pages(`releases/${release.id}/assets`)
  const index = JSON.parse(await readFile(catalogPath, 'utf8'))
  const releaseInfo = {
    commit,
    version: tag.slice(1),
    tag,
    releasedAt: release.published_at,
    url: release.html_url,
  }
  const previous = index.inventory.find((item) => item.tag === tag)
  assert(
    !previous || json(previous) === json(releaseInfo),
    'published release identity changed',
  )
  const pending = []
  for (const { asset, report } of await readReportManifests(assets)) {
    assert(
      report.source.commit === commit &&
        report.source.tag === tag &&
        asset.name === `${report.id}.manifest.json`,
      'report release identity mismatch',
    )
    report.checks = []
    report.recordIds = []
    report.metrics = []
    for (const file of report.files) {
      const attachment = assets.find((asset) => asset.name === file.name)
      assert(
        attachment &&
          attachment.state === 'uploaded' &&
          attachment.uploader?.login === 'github-actions[bot]' &&
          attachment.size === file.bytes,
        'missing report evidence',
      )
      file.url = `https://github.com/${repository}/releases/download/${tag}/${file.name}`
      if (file.kind === 'evidence' && attachment.digest) {
        assert(
          attachment.digest === `sha256:${file.sha256}`,
          'evidence digest mismatch',
        )
        continue
      }
      const bytes = await request(`releases/assets/${attachment.id}`, true)
      assert(
        bytes.length === file.bytes && sha256(bytes) === file.sha256,
        `changed evidence ${file.name}`,
      )
      if (file.kind === 'evidence') continue
      const value = JSON.parse(bytes)
      if (file.kind === 'checks')
        report.checks = validateChecks(value, report).checks
      else if (file.kind === 'metric') {
        validateRecord(value)
        assert(!value.source.dirty, 'dirty release measurement')
        report.recordIds.push(value.id)
        report.metrics.push({ name: file.name, id: value.id })
        pending.push({
          path: join(archiveDirectory, `${value.id}.json`),
          bytes,
        })
      } else {
        const run = value.run
        assert(
          run?.head_sha === report.publisher.commit &&
            run.head_branch === 'master' &&
            run.event === 'workflow_dispatch' &&
            run.path === '.github/workflows/publish-release.yml' &&
            String(run.id) === report.publisher.runId &&
            run.run_attempt === report.publisher.attempt,
          'publisher receipt mismatch',
        )
      }
    }
    report.url = asset.browser_download_url
    pending.push({
      path: join(reportsDirectory, `${report.id}.json`),
      bytes: json(report),
    })
    if (!index.reports.includes(`${report.id}.json`))
      index.reports.push(`${report.id}.json`)
  }
  // Preflight every conflict before writing any new report or modifying the index.
  for (const file of pending) {
    try {
      assert(
        Buffer.from(await readFile(file.path)).equals(Buffer.from(file.bytes)),
        `immutable import conflict: ${file.path}`,
      )
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  await mkdir(reportsDirectory, { recursive: true })
  for (const file of pending) await writeImmutable(file.path, file.bytes)
  if (!previous) index.inventory.push(releaseInfo)
  index.inventory.sort((a, b) => a.releasedAt.localeCompare(b.releasedAt))
  index.reports.sort()
  await writeFile(catalogPath, json(index))
  const catalog = await loadCatalog()
  process.stdout.write(
    `Imported ${tag}; ${catalog.records.length} immutable records, ${catalog.reports.length} report captures. Review Git changes, commit, and push through normal repository rules.\n`,
  )
}
if (process.argv[1] === import.meta.filename) {
  if (process.argv.includes('--help')) {
    process.stdout.write(
      'Usage: pnpm release:reports --tag vMAJOR.MINOR.PATCH\nValidates and imports existing release evidence into Git data locally.\n',
    )
    process.exit(0)
  }
  const tag = process.argv[process.argv.indexOf('--tag') + 1]
  // Use gh's existing login; never request or print a new token.
  gh(['auth', 'status'])
  await importRelease(tag)
}
