// Archive available evidence without making advisory jobs a publication gate.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  assert,
  gh,
  pages,
  repository,
  request,
  uploadImmutable,
  readJsonAsset,
} from './github.mjs'
import { releasedCandidate } from './publish.mjs'
import { trustedRun } from './candidate.mjs'
import { json, sha256, git } from '../performance/records.mjs'
import { readMetricArtifact, loadBenchmarkSource } from './metric-artifact.mjs'
import { validateManifest, validateChecks } from '../reports/catalog.mjs'
import { jestCounts, playwrightCounts } from '../reports/results.mjs'
import { readStoreReceipts, summarizeStoreReceipts } from './store-receipts.mjs'
import { readCommittedLocalCaptures } from '../performance/local-capture.mjs'

assert(
  process.env.GITHUB_REPOSITORY === repository &&
    process.env.GITHUB_REF_NAME === 'master',
  'evidence publisher must run on master',
)
const id = `release-report-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`
const output = resolve('.tmp/release-evidence', id)
await mkdir(output, { recursive: true })
const { candidate, release, publication } = await releasedCandidate(
  process.env.RELEASE_TAG,
  join(output, 'packages'),
  process.env.CANDIDATE_SHA256,
)
const existing = await pages(`releases/${release.id}/assets`)
const existingManifest = existing.find(
  (file) => file.name === `${id}.manifest.json`,
)
const archivedManifest =
  existingManifest && (await readJsonAsset(existingManifest, 'report manifest'))
if (archivedManifest) {
  const manifest = validateManifest(archivedManifest.value)
  assert(
    manifest.id === id &&
      manifest.source.commit === candidate.source.commit &&
      manifest.source.tag === candidate.source.tag,
    'archived report identity mismatch',
  )
  process.stdout.write('Evidence capture already archived.\n')
  process.exit(0)
}
const files = [],
  checks = [],
  unavailableEvidence = []
async function save(name, bytes, kind) {
  await writeFile(join(output, name), bytes)
  files.push({ name, bytes: bytes.length, sha256: sha256(bytes), kind })
}
const typedSteps = [
  [/Unit Test/, 'test'],
  [/Integration Test|Firefox browser integration|tab move regression/, 'test'],
  [/Lint/, 'lint'],
  [/^Build|^Compile|^Verify packaged|Validate release metadata/, 'build'],
]
async function counts(directory, runId) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await counts(path, runId)
    else if (
      ['unit.json', 'playwright.json', 'results.json'].includes(entry.name)
    ) {
      const value = JSON.parse(await readFile(path, 'utf8'))
      const pattern =
        entry.name === 'unit.json'
          ? /Unit Test/
          : entry.name === 'playwright.json'
            ? /Integration Test/
            : /Firefox browser integration/
      const check = checks.find(
        (check) => check.id.startsWith(`${runId}-`) && pattern.test(check.name),
      )
      if (check)
        check.counts =
          entry.name === 'playwright.json'
            ? playwrightCounts(value)
            : jestCounts(value)
    }
  }
}
async function capture(run) {
  const jobs = await pages(
    `actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`,
  )
  await save(
    `${id}-run-${run.id}.json`,
    Buffer.from(json({ run, jobs })),
    'evidence',
  )
  for (const job of jobs) {
    const typed = (job.steps || []).filter((step) =>
      typedSteps.some(([pattern]) => pattern.test(step.name)),
    )
    for (const step of [
      { name: job.name, conclusion: job.conclusion },
      ...typed,
    ])
      checks.push({
        id: `${run.id}-${run.run_attempt}-${job.id}-${step.number || 0}`,
        kind:
          typedSteps.find(([pattern]) => pattern.test(step.name))?.[1] ||
          'workflow',
        name: step.name,
        environment: `${job.name} · ${job.runner_name || 'CI runner'}`,
        conclusion:
          step.conclusion ||
          (job.status === 'completed' ? job.conclusion : 'pending') ||
          'missing',
        counts: null,
        url: job.html_url,
      })
  }
  for (const artifact of await pages(`actions/runs/${run.id}/artifacts`)) {
    if (
      artifact.expired ||
      !/^(report-results-|performance-diagnostics-|performance-bundle-|performance-runtime-)/.test(
        artifact.name,
      )
    )
      continue
    // Never use an earlier attempt when the current attempt failed or is pending.
    if (!artifact.name.endsWith(`-${run.run_attempt}`)) continue
    if (artifact.size_in_bytes > 100_000_000) {
      unavailableEvidence.push({
        name: artifact.name,
        reason: 'Archive exceeds 100 MB; job outcomes remain preserved.',
      })
      continue
    }
    const bytes = await request(`actions/artifacts/${artifact.id}/zip`, true)
    if (bytes.length > 100_000_000) {
      unavailableEvidence.push({
        name: artifact.name,
        reason: 'Archive exceeds 100 MB.',
      })
      continue
    }
    await save(`${id}-artifact-${artifact.id}.zip`, bytes, 'evidence')
    if (/^performance-diagnostics-/.test(artifact.name)) continue
    const directory = join(output, `input-${artifact.id}`)
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
    if (artifact.name.startsWith('report-results-')) {
      await counts(directory, run.id)
      continue
    }
    const records = await readMetricArtifact(
      directory,
      artifact,
      run,
      candidate.source.commit,
    )
    for (const { bytes, value } of records)
      if (!files.some((file) => file.name === `${id}-${value.id}.json`))
        await save(`${id}-${value.id}.json`, bytes, 'metric')
  }
}
let candidateRun
try {
  candidateRun = await trustedRun(
    candidate.build.runId,
    'release-candidate.yml',
  )
} catch (error) {
  if (!/HTTP 404/.test(String(error.stderr))) throw error
}
if (
  candidateRun &&
  candidateRun.run_attempt === candidate.build.attempt &&
  candidateRun.head_sha === candidate.build.controllerCommit
) {
  await capture(candidateRun)
} else {
  for (const [index, check] of publication.checks.entries())
    checks.push({
      id: `archived-gate-${index}`,
      kind: 'workflow',
      name: check.name,
      environment: 'Archived publication gate',
      conclusion: check.conclusion,
      counts: null,
      url: check.url,
    })
}
if (process.env.METRIC_RUN) {
  const run = await trustedRun(
    process.env.METRIC_RUN,
    'performance-history.yml',
  )
  assert(run.status === 'completed', 'advisory run is still running')
  const source = await loadBenchmarkSource(run, candidate.source.commit, output)
  if (source) {
    await save(
      `${id}-benchmark-source-${run.id}-${run.run_attempt}.json`,
      source.bytes,
      'evidence',
    )
    await capture(run)
  } else {
    const reason =
      'Benchmark source could not be verified; outcomes and measurements were not attached to this release.'
    unavailableEvidence.push({
      name: `performance-source-${run.id}-${run.run_attempt}`,
      reason,
    })
    process.stderr.write(`Warning: ${reason}\n`)
  }
}
// Only reviewed captures in this trusted master checkout are eligible. Their
// machine/protocol and raw metric provenance remain local after bot archival.
for (const local of await readCommittedLocalCaptures({
  candidate,
  digest: process.env.CANDIDATE_SHA256,
})) {
  await save(`${id}-${local.capture.id}.capture.json`, local.bytes, 'evidence')
  for (const record of local.records)
    await save(`${id}-${record.name}`, record.bytes, 'metric')
}
for (const name of ['candidate.json', 'publication.json'])
  await save(
    `${id}-${name}`,
    await readFile(join(output, 'packages', name)),
    'evidence',
  )
// Store journals are a snapshot of submission state, independent of test status.
const submissions = []
const storeAssets = await pages(`releases/${release.id}/assets`)
for (const store of [
  'chrome',
  'firefox',
  'edge',
  ...(candidate.safari ? ['safari'] : []),
]) {
  const receipts = await readStoreReceipts(
    storeAssets,
    store,
    candidate,
    process.env.CANDIDATE_SHA256,
  )
  for (const { name, bytes } of receipts)
    if (bytes) await save(`${id}-${name}`, bytes, 'evidence')
    else
      unavailableEvidence.push({
        name,
        reason:
          'Store receipt upload did not complete; inspect store status before retrying.',
      })
  const submission = summarizeStoreReceipts(store, receipts)
  if (submission) submissions.push(submission)
}
const publisher = await request(`actions/runs/${process.env.GITHUB_RUN_ID}`)
await save(
  `${id}-publisher.json`,
  Buffer.from(json({ run: publisher })),
  'publisher',
)
const manifest = {
  schemaVersion: 1,
  kind: 'release-report',
  id,
  recordedAt: new Date().toISOString(),
  source: candidate.source,
  publisher: {
    repository,
    workflow: publisher.path.replace('.github/workflows/', ''),
    commit: git(['rev-parse', 'HEAD']),
    runId: String(publisher.id),
    attempt: publisher.run_attempt,
  },
  files,
  unavailableEvidence,
  submissions,
}
const data = { schemaVersion: 1, commit: candidate.source.commit, checks }
validateChecks(data, manifest)
await save(`${id}-checks.json`, Buffer.from(json(data)), 'checks')
validateManifest(manifest)
await writeFile(join(output, `${id}.manifest.json`), json(manifest))
for (const file of files)
  await uploadImmutable(candidate.source.tag, join(output, file.name))
await uploadImmutable(candidate.source.tag, join(output, `${id}.manifest.json`))
process.stdout.write(
  `Archived ${id}: ${checks.length} checks, ${files.length} files. Import it locally with pnpm release:reports --tag ${candidate.source.tag}.\n`,
)
