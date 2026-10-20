// Trusted publisher: never run this workflow with contents:write on a PR ref.
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  repository,
  assert,
  request,
  pages,
  validateManifest,
  validateChecks,
} from './catalog.mjs'
import { git, json, sha256, validateRecord } from '../performance/records.mjs'
import { jestCounts, playwrightCounts } from './results.mjs'

const gh = (args) =>
  execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
const tag = process.env.RELEASE_TAG
assert(/^v\d+\.\d+\.\d+$/.test(tag || ''), 'RELEASE_TAG is required')
assert(
  process.env.GITHUB_REPOSITORY === repository &&
    process.env.GITHUB_REF_NAME === 'master',
  'publisher must run on the trusted default branch',
)
const release = await request(`releases/tags/${encodeURIComponent(tag)}`)
assert(!release.draft && !release.prerelease, 'release must be published')
const subject = (await request(`commits/${encodeURIComponent(tag)}`)).sha
const publisherCommit = git(['rev-parse', 'HEAD'])
const runId = String(process.env.GITHUB_RUN_ID),
  attempt = String(process.env.GITHUB_RUN_ATTEMPT)
const id = `release-report-${runId}-${attempt}`
const output = resolve('.tmp/release-report', id)
await mkdir(output, { recursive: true })
const files = [],
  checks = [],
  unavailableEvidence = []
async function diagnostic(artifact, name) {
  if (artifact.size_in_bytes > 100_000_000) {
    unavailableEvidence.push({
      artifactId: artifact.id,
      name: artifact.name,
      reason:
        'Diagnostic archive exceeds 100 MB; check outcomes are still preserved.',
    })
    return false
  }
  const bytes = await request(`actions/artifacts/${artifact.id}/zip`, true)
  if (bytes.length > 100_000_000) {
    unavailableEvidence.push({
      artifactId: artifact.id,
      name: artifact.name,
      reason:
        'Diagnostic archive exceeds 100 MB; check outcomes are still preserved.',
    })
    return false
  }
  await save(name, bytes, 'evidence')
  return true
}
if (process.env.REPORT_JOB_RESULTS) {
  const outcomes = JSON.parse(process.env.REPORT_JOB_RESULTS)
  for (const [key, label, kind] of [
    ['build-release', 'Release package build', 'build'],
    ['bundle-performance', 'Advisory bundle measurement', 'workflow'],
    ['runtime-performance', 'Advisory runtime measurement', 'workflow'],
    ['attach-release-assets', 'Release package attachment', 'workflow'],
  ]) {
    assert(outcomes[key]?.result, `missing workflow outcome ${key}`)
    checks.push({
      id: `job-${key}`,
      kind,
      name: label,
      environment: 'Release workflow',
      conclusion: outcomes[key].result,
      counts: null,
      url: `https://github.com/${repository}/actions/runs/${runId}`,
    })
  }
}
const previousManifest = (await pages(`releases/${release.id}/assets`)).find(
  (asset) => asset.name === `${id}.manifest.json`,
)
if (previousManifest) {
  const previous = validateManifest(
    JSON.parse(await request(`releases/assets/${previousManifest.id}`, true)),
  )
  assert(
    previous.source.commit === subject &&
      previous.publisher.commit === publisherCommit,
    'existing report identity conflicts',
  )
  const assets = await pages(`releases/${release.id}/assets`)
  for (const file of previous.files) {
    const asset = assets.find((item) => item.name === file.name)
    assert(asset, `existing report is incomplete: ${file.name}`)
    const bytes = await request(`releases/assets/${asset.id}`, true)
    assert(
      bytes.length === file.bytes && sha256(bytes) === file.sha256,
      `existing report has changed: ${file.name}`,
    )
  }
  process.stdout.write(`Report ${id} is already complete.\n`)
  process.exit(0)
}
async function save(name, bytes, kind) {
  assert(!files.some((file) => file.name === name), `duplicate file ${name}`)
  await writeFile(join(output, name), bytes)
  files.push({ name, bytes: bytes.length, sha256: sha256(bytes), kind })
}
async function applyCounts(directory, matches) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await applyCounts(path, matches)
    else if (
      ['unit.json', 'playwright.json', 'results.json'].includes(entry.name)
    ) {
      const result = JSON.parse(await readFile(path, 'utf8'))
      const pattern =
        entry.name === 'unit.json'
          ? /Unit Test|Release unit tests/
          : entry.name === 'playwright.json'
            ? /Integration Test|Run release gate/
            : /Firefox browser integration/
      const check = checks.find(
        (item) => matches(item) && pattern.test(item.name),
      )
      if (check)
        check.counts =
          entry.name === 'playwright.json'
            ? playwrightCounts(result)
            : jestCounts(result)
    }
  }
}
const typedSteps = [
  [/Unit Test|Release unit tests/, 'test'],
  [
    /Integration Test|Firefox browser integration|unloaded tab move|Unloaded tab move|Run release gate/,
    'test',
  ],
  [/regression/, 'test'],
  [/Lint Safari/, 'lint'],
  [/^Build|^Compile|^Verify packaged/, 'build'],
]
async function captureRun(run, label) {
  assert(
    run.head_sha === subject,
    'workflow is for a different source revision',
  )
  const jobs = await pages(
    `actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`,
  )
  await save(
    `${id}-${label}-${run.id}-${run.run_attempt}-jobs.json`,
    Buffer.from(json({ run, jobs })),
    'evidence',
  )
  for (const job of jobs) {
    const environment = `${label} · ${job.name} · ${job.runner_name || job.labels?.join(', ') || 'runner not recorded'}`
    const steps = job.steps || []
    const typed = steps.filter((step) =>
      typedSteps.some(([pattern]) => pattern.test(step.name)),
    )
    // A job that never reached a check still leaves a visible outcome.
    for (const step of typed.length
      ? typed
      : [{ name: job.name, conclusion: job.conclusion }]) {
      const kind =
        typedSteps.find(([pattern]) => pattern.test(step.name))?.[1] ||
        'workflow'
      checks.push({
        id: `${run.id}-${run.run_attempt}-${job.id}-${step.number || 0}`,
        kind,
        name: step.name,
        environment,
        conclusion:
          step.conclusion ||
          (job.status === 'completed' ? job.conclusion : 'pending') ||
          'missing',
        counts: null,
        url: job.html_url,
      })
    }
  }
  const artifacts = await pages(`actions/runs/${run.id}/artifacts`)
  for (const artifact of artifacts.filter(
    (item) =>
      !item.expired &&
      /^(report-results-|playwright-report$|firefox-integration-results$|performance-diagnostics-)/.test(
        item.name,
      ),
  )) {
    // Preserve structured results and browser diagnostics beyond Actions retention.
    if (!(await diagnostic(artifact, `${id}-${label}-${artifact.id}.zip`)))
      continue
    if (/^report-results-|^firefox-integration-results$/.test(artifact.name)) {
      const directory = join(output, `results-${artifact.id}`)
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
      const node = artifact.name.match(/^report-results-node-(\d+)-/)
      await applyCounts(
        directory,
        (check) =>
          check.id.startsWith(`${run.id}-`) &&
          (node
            ? check.environment.includes(`(${node[1]})`)
            : check.environment.includes('Firefox integration')),
      )
    }
  }
}

// Independent CI runs are selected by exact SHA and latest attempt, including
// failures. Bounded waiting never turns a missing check into a passing check.
for (const workflow of ['nodejs.yml', 'safari.yml']) {
  const deadline = Date.now() + 20 * 60_000
  let run
  do {
    const runs = (
      await pages(`actions/workflows/${workflow}/runs?head_sha=${subject}`)
    ).filter((item) => item.event === 'push' && item.head_branch === 'master')
    run = runs.sort(
      (a, b) => b.run_number - a.run_number || b.run_attempt - a.run_attempt,
    )[0]
    if (!run || run.status === 'completed' || Date.now() >= deadline) break
    await new Promise((done) => setTimeout(done, 30_000))
  } while (true)
  if (run) await captureRun(run, workflow.replace('.yml', ''))
  else
    checks.push({
      id: `missing-${workflow.replace('.yml', '')}`,
      kind: 'workflow',
      name: workflow,
      environment: 'No exact-revision workflow run found',
      conclusion: 'missing',
      counts: null,
      url: `https://github.com/${repository}/actions/runs/${runId}`,
    })
}
const current = await request(`actions/runs/${runId}`)
// The reusable performance workflow's head is the release source. The current
// release workflow is still running; only its completed measurement/build jobs
// are evidence, never the collector/deployment job itself.
const jobs = await pages(`actions/runs/${runId}/attempts/${attempt}/jobs`)
await save(
  `${id}-release-jobs.json`,
  Buffer.from(json({ run: current, jobs })),
  'publisher',
)
for (const job of jobs.filter((item) =>
  /Build Release|Compare frozen revisions/.test(item.name),
)) {
  checks.push({
    id: `release-${job.id}`,
    kind: /Build Release/.test(job.name) ? 'build' : 'workflow',
    name: job.name,
    environment: 'Ubuntu release workflow',
    conclusion: job.conclusion || 'missing',
    counts: null,
    url: job.html_url,
  })
  for (const step of (job.steps || []).filter((step) =>
    /Release unit tests|Run release gate/.test(step.name),
  ))
    checks.push({
      id: `release-${job.id}-${step.number}`,
      kind: 'test',
      name: step.name,
      environment: 'Ubuntu release gate',
      conclusion: step.conclusion || 'missing',
      counts: null,
      url: job.html_url,
    })
}

const artifacts = await pages(`actions/runs/${runId}/artifacts`)
let metricRunId = runId,
  metricAttempt = attempt
if (process.env.METRIC_RUN_ID) {
  assert(/^\d+$/.test(process.env.METRIC_RUN_ID), 'invalid metric run ID')
  const run = await request(`actions/runs/${process.env.METRIC_RUN_ID}`)
  assert(
    run.status === 'completed' &&
      run.conclusion === 'success' &&
      run.path === '.github/workflows/performance-history.yml' &&
      run.head_branch === 'master' &&
      run.event === 'workflow_dispatch',
    'metrics must come from a successful trusted advisory run',
  )
  metricRunId = String(run.id)
  metricAttempt = String(run.run_attempt)
}
const metricArtifacts =
  metricRunId === runId
    ? artifacts
    : await pages(`actions/runs/${metricRunId}/artifacts`)
let importedSubject = false
for (const artifact of metricArtifacts.filter(
  (item) =>
    !item.expired &&
    (item.name === `performance-bundle-${metricRunId}-${metricAttempt}` ||
      item.name === `performance-runtime-${metricRunId}-${metricAttempt}`),
)) {
  const directory = join(output, `input-${artifact.id}`)
  gh([
    'run',
    'download',
    metricRunId,
    '--repo',
    repository,
    '--name',
    artifact.name,
    '--dir',
    directory,
  ])
  async function importMetrics(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = join(path, entry.name)
      if (entry.isDirectory()) await importMetrics(file)
      else if (entry.name.endsWith('.json') && /[/\\]runs[/\\]/.test(file)) {
        const bytes = await readFile(file),
          record = JSON.parse(bytes)
        validateRecord(record)
        assert(
          !record.source.dirty &&
            String(record.provenance.workflowRun) === metricRunId,
          'measurement has different workflow provenance',
        )
        const name = `${id}-${record.id}.json`
        if (record.source.commit === subject) importedSubject = true
        if (!files.some((item) => item.name === name))
          await save(name, bytes, 'metric')
      }
    }
  }
  await importMetrics(directory)
}
if (process.env.METRIC_RUN_ID)
  assert(
    importedSubject,
    'the advisory capture does not include this release revision',
  )
for (const artifact of artifacts.filter(
  (item) =>
    !item.expired &&
    /^(report-results-|performance-diagnostics-)/.test(item.name),
)) {
  if (!(await diagnostic(artifact, `${id}-release-${artifact.id}.zip`)))
    continue
  if (artifact.name.startsWith('report-results-')) {
    const directory = join(output, `results-${artifact.id}`)
    gh([
      'run',
      'download',
      runId,
      '--repo',
      repository,
      '--name',
      artifact.name,
      '--dir',
      directory,
    ])
    await applyCounts(directory, (check) => check.id.startsWith('release-'))
  }
}
const checkData = { schemaVersion: 1, commit: subject, checks }
const manifest = {
  schemaVersion: 1,
  kind: 'release-report',
  id,
  recordedAt: new Date().toISOString(),
  source: { commit: subject, version: tag.slice(1), tag },
  publisher: {
    repository,
    workflow: process.env.REPORT_WORKFLOW || 'release-please.yml',
    commit: publisherCommit,
    runId,
    attempt,
  },
  files,
  unavailableEvidence,
}
validateChecks(checkData, manifest)
await save(`${id}-checks.json`, Buffer.from(json(checkData)), 'checks')
validateManifest(manifest)
const manifestName = `${id}.manifest.json`
await writeFile(join(output, manifestName), json(manifest))
// Never use --clobber: retries accept identical bytes, conflicts fail closed.
const existing = await pages(`releases/${release.id}/assets`)
async function upload(name) {
  const bytes = await readFile(join(output, name))
  const asset = existing.find((item) => item.name === name)
  if (asset) {
    const previous = await request(`releases/assets/${asset.id}`, true)
    assert(
      previous.length === bytes.length && sha256(previous) === sha256(bytes),
      `refusing to overwrite ${name}`,
    )
  } else
    gh(['release', 'upload', tag, join(output, name), '--repo', repository])
}
if (process.env.REPORT_DRY_RUN !== '1') {
  for (const file of files) await upload(file.name)
  // Readers discover only this commit marker, after every attachment exists.
  await upload(manifestName)
}
process.stdout.write(
  `Prepared ${manifestName}: ${files.length} assets, ${checks.length} checks.\n`,
)
