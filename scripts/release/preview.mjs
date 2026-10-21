// Assemble a local, unpublished candidate view without changing Git history.
import { join } from 'node:path'
import { loadCatalog } from '../reports/catalog.mjs'
import { buildViewer } from '../performance/reports.mjs'
import { json, sha256 } from '../performance/records.mjs'
import { assert, gh, pages, repository, request } from './github.mjs'
import { readMetricArtifact } from './metric-artifact.mjs'

export async function candidatePreview({ candidate, run, jobs }, output) {
  const catalog = await loadCatalog()
  catalog.previewWarnings = []
  const records = new Map(catalog.records.map((record) => [record.id, record]))
  const artifacts = await pages(`actions/runs/${run.id}/artifacts`)
  for (const artifact of artifacts.filter(
    (artifact) =>
      !artifact.expired &&
      (artifact.name === `performance-bundle-${run.id}-${run.run_attempt}` ||
        artifact.name === `performance-runtime-${run.id}-${run.run_attempt}`),
  )) {
    try {
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
      const captures = (
        await readMetricArtifact(
          directory,
          artifact,
          run,
          candidate.source.commit,
        )
      ).map(({ value }) => value)
      for (const record of captures) {
        assert(
          !records.has(record.id) ||
            json(records.get(record.id)) === json(record),
          'conflicting preview record',
        )
      }
      for (const record of captures) records.set(record.id, record)
    } catch {
      catalog.previewWarnings.push(artifact.name)
      process.stderr.write(
        `Advisory capture ${artifact.name} could not be loaded; preview measurements remain unavailable. Required gates are still shown.\n`,
      )
    }
  }
  const source = await request(`commits/${candidate.source.commit}`)
  catalog.candidates = [
    {
      ...candidate.source,
      committedAt: source.commit.committer.date,
      status: 'candidate',
      dirty: false,
      label: `${candidate.source.version} candidate`,
    },
  ]
  catalog.preview = true
  catalog.records = [...records.values()]
  const typed = [
    [
      /Unit Test|Integration Test|Firefox browser integration|tab move regression/,
      'test',
    ],
    [/Lint/, 'lint'],
    [/Build|Compile|Verify packaged/, 'build'],
  ]
  const checks = []
  for (const job of jobs)
    for (const step of [
      { name: job.name, conclusion: job.conclusion },
      ...(job.steps || []).filter((step) =>
        typed.some(([pattern]) => pattern.test(step.name)),
      ),
    ])
      checks.push({
        id: `preview-${job.id}-${step.number || 0}`,
        kind:
          typed.find(([pattern]) => pattern.test(step.name))?.[1] || 'workflow',
        name: step.name,
        environment: job.name,
        conclusion:
          step.conclusion ||
          (job.status === 'completed' ? job.conclusion : 'pending') ||
          'missing',
        counts: null,
        url: job.html_url,
      })
  catalog.reports.push({
    id: `candidate-preview-${run.id}-${run.run_attempt}`,
    source: candidate.source,
    recordedAt: new Date().toISOString(),
    publisher: {
      repository,
      workflow: 'release-candidate.yml',
      commit: run.head_sha,
      runId: String(run.id),
      attempt: run.run_attempt,
    },
    checks,
    files: [],
  })
  catalog.digest = sha256(
    json({
      records: catalog.records,
      reports: catalog.reports,
      inventory: catalog.inventory,
      candidates: catalog.candidates,
    }),
  )
  const directory = join(output, 'preview')
  await buildViewer(catalog.records, directory, { catalog })
  return directory
}
