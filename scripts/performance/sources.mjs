// Freeze requested refs before setup or profiling. This receipt identifies the
// benchmark target even when the run stops before producing measurement data.
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { git, json } from './records.mjs'
import { resolveReleaseBaseline } from '../release-baseline.mjs'
import { assert, repository } from '../reports/catalog.mjs'

function resolveCommit(ref) {
  try {
    return git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`])
  } catch {
    // SHA checkouts in Actions have fetched remote branches but no local branch.
    return git([
      'rev-parse',
      '--verify',
      '--end-of-options',
      `refs/remotes/origin/${ref}^{commit}`,
    ])
  }
}

export function previousRelease(ref = 'HEAD', base = 'auto') {
  const resolved = resolveCommit(ref)
  // Exclude the candidate's own release tag, including the withdrawn 3.0 tag.
  return resolveCommit(
    base === 'auto' ? resolveReleaseBaseline(`${resolved}^`) : base,
  )
}

export function validateBenchmarkSource(receipt, run, commit) {
  const commitPattern = /^[a-f0-9]{40}$/
  assert(
    receipt?.schemaVersion === 1 &&
      receipt.kind === 'benchmark-source' &&
      receipt.repository === repository &&
      /^\d+$/.test(receipt.runId) &&
      receipt.runId === String(run.id) &&
      Number.isSafeInteger(receipt.attempt) &&
      receipt.attempt >= 1 &&
      receipt.attempt === run.run_attempt &&
      commitPattern.test(receipt.controllerCommit) &&
      receipt.controllerCommit === run.head_sha &&
      ['target', 'baseline', 'reference'].every((key) =>
        commitPattern.test(receipt.source?.[key]),
      ),
    'invalid benchmark source receipt or run/attempt identity',
  )
  assert(
    receipt.source.target === commit,
    'benchmark target does not match the release source',
  )
  return receipt
}

export function freezeBenchmarkSource({ head, base = 'auto', reference }, run) {
  const target = resolveCommit(head)
  const receipt = {
    schemaVersion: 1,
    kind: 'benchmark-source',
    repository,
    runId: String(run.id),
    attempt: run.run_attempt,
    controllerCommit: run.head_sha,
    source: {
      target,
      baseline: previousRelease(target, base),
      reference: resolveCommit(reference),
    },
  }
  return validateBenchmarkSource(receipt, run, target)
}

if (process.argv[1] === import.meta.filename) {
  const { values } = parseArgs({
    options: {
      head: { type: 'string' },
      base: { type: 'string', default: 'auto' },
      reference: { type: 'string' },
      output: { type: 'string' },
    },
  })
  assert(
    process.env.GITHUB_REPOSITORY === repository,
    'unexpected benchmark repository',
  )
  const receipt = freezeBenchmarkSource(values, {
    id: process.env.GITHUB_RUN_ID,
    run_attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
    head_sha: process.env.GITHUB_SHA,
  })
  const directory = resolve(values.output)
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'benchmark-source.json'), json(receipt))
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `head=${receipt.source.target}\nbase=${receipt.source.baseline}\nreference=${receipt.source.reference}\n`,
  )
}
