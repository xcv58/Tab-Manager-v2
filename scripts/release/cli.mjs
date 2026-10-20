import { parseArgs } from 'node:util'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { assert, gh, repository } from './github.mjs'
import { verifiedCandidate, commitPattern, hashPattern } from './candidate.mjs'
import { candidatePreview } from './preview.mjs'
import { reviewPublishedRelease } from './publish.mjs'
import { git, json } from '../performance/records.mjs'
import {
  assertReleaseVersion,
  compareVersions,
  readReleaseVersion,
} from '../release-policy.mjs'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    version: { type: 'string' },
    notes: { type: 'string' },
    sha: { type: 'string' },
    tag: { type: 'string' },
    run: { type: 'string' },
    approve: { type: 'string' },
    stores: { type: 'string', default: 'chrome,firefox,edge' },
    'metric-run': { type: 'string' },
    reconciled: { type: 'boolean', default: false },
    'no-benchmarks': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
})
const [command] = positionals
const help = `Local release driver (no store credentials needed locally):
  pnpm release:prepare --version 3.0.1 --notes /absolute/path/notes.md
  # Review/version changes through the normal Git workflow, then freeze merged SHA:
  pnpm release:verify --sha FULL_MASTER_COMMIT
  pnpm release:review --run CANDIDATE_RUN_ID
  pnpm release:review --tag v3.0.1  # recover a published review after CI artifacts expire
  pnpm release:publish --run CANDIDATE_RUN_ID --approve REVIEWED_CANDIDATE_SHA256
  # Resume only selected unfinished stores, or append late benchmark evidence:
  pnpm release:publish --run RUN --approve SHA256 --stores edge [--reconciled]
  pnpm release:publish --run RUN --approve SHA256 --stores none [--metric-run RUN]
  pnpm release:reports --tag v3.0.1
  pnpm build:site

Preparation edits version/changelog files locally. Verification dispatches CI.
Review downloads immutable packages and prints required check outcomes.
Publishing requires the exact locally reviewed digest; --reconciled means you
checked the store and its archived operation IDs before retrying an uncertain attempt.
No command merges PRs, commits report data, or deploys production directly.
`
if (values.help || !command) {
  process.stdout.write(help)
  process.exit(0)
}
if (command === 'prepare') {
  const version = assertReleaseVersion(values.version)
  assert(
    compareVersions(version, readReleaseVersion()) > 0,
    'new version must exceed current source version',
  )
  assert(values.notes, '--notes must name the reviewed release notes file')
  assert(
    !git(['status', '--porcelain', '--untracked-files=no']),
    'prepare requires a clean tracked working tree',
  )
  const notes = (await readFile(resolve(values.notes), 'utf8')).trim()
  assert(notes, 'release notes cannot be empty')
  for (const path of [
    'packages/extension/package.json',
    'packages/safari-native/WebExtension/manifest.json',
  ]) {
    const value = JSON.parse(await readFile(path, 'utf8'))
    value.version = version
    await writeFile(path, json(value))
  }
  const native = 'packages/safari-native/project.yml'
  await writeFile(
    native,
    (await readFile(native, 'utf8')).replace(
      /^([ \t]+MARKETING_VERSION:[ \t]*)(['"]?)[^'"\s]+\2[ \t]*$/m,
      (_match, prefix) => `${prefix}'${version}'`,
    ),
  )
  const path = 'packages/extension/CHANGELOG.md',
    current = await readFile(path, 'utf8')
  await writeFile(
    path,
    current.replace(
      /^(# [^\n]*\n)/,
      (_match, heading) =>
        `${heading}\n## ${version} (${new Date().toISOString().slice(0, 10)})\n\n${notes}\n`,
    ),
  )
  assert(readReleaseVersion() === version, 'prepared metadata differs')
  process.stdout.write(
    `Prepared ${version}. Review git diff, commit and merge through normal review. No release was published.\n`,
  )
} else if (command === 'verify') {
  assert(
    commitPattern.test(values.sha || ''),
    '--sha must be a full reviewed master commit',
  )
  gh([
    'workflow',
    'run',
    'release-candidate.yml',
    '--repo',
    repository,
    '--ref',
    'master',
    '-f',
    `candidate=${values.sha}`,
    '-f',
    `benchmarks=${!values['no-benchmarks']}`,
  ])
  process.stdout.write(
    `Candidate verification dispatched for ${values.sha}. Find its run ID with gh run list --workflow release-candidate.yml, then run pnpm release:review --run ID.\n`,
  )
} else if (command === 'review') {
  assert(
    (values.tag && /^v\d+\.\d+\.\d+$/.test(values.tag)) ||
      /^\d+$/.test(values.run || ''),
    '--run or --tag is required',
  )
  const root = resolve('.tmp/releases', values.tag || values.run)
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(join(root, 'packages-'))
  let verified, preview
  if (values.tag) {
    const published = await reviewPublishedRelease(values.tag, directory)
    verified = {
      ...published,
      jobs: published.publication.checks.map((check) => ({
        ...check,
        conclusion: 'success',
      })),
    }
  } else {
    verified = await verifiedCandidate(values.run, directory, undefined, {
      gate: false,
    })
    preview = await candidatePreview(verified, directory)
  }
  const { candidate, digest, jobs } = verified
  const reviewRoot = resolve('.tmp/releases', String(candidate.build.runId))
  await mkdir(reviewRoot, { recursive: true })
  await writeFile(
    join(reviewRoot, 'review.json'),
    json({
      candidateSha256: digest,
      candidate,
      directory,
      preview,
      reviewedAt: new Date().toISOString(),
    }),
  )
  process.stdout.write(
    `Version: ${candidate.source.version}\nSource: ${candidate.source.commit}\nCandidate SHA-256: ${digest}\nPackages: ${directory}\n\n`,
  )
  for (const job of jobs)
    process.stdout.write(`${job.name}: ${job.conclusion || job.status}\n`)
  process.stdout.write(
    preview
      ? `\nCandidate report: ${preview}\nServe it with: pnpm preview:release-media "${preview}" 8782\nOpen http://127.0.0.1:8782/?candidates=1&target=${candidate.source.commit}\nAdvisory benchmarks are optional; missing measurements remain explicit. Re-run review after benchmarks finish to refresh the local preview.\nReview source, packages and report before approving publication.\n`
      : `\nPublished packages verified using archived gate receipts. Candidate run: ${candidate.build.runId}. Use this run ID and the displayed digest for a selected-store retry.\n`,
  )
} else if (command === 'publish') {
  assert(
    /^\d+$/.test(values.run || '') && hashPattern.test(values.approve || ''),
    '--run and --approve REVIEWED_SHA256 are required',
  )
  const reviewed = JSON.parse(
    await readFile(resolve('.tmp/releases', values.run, 'review.json'), 'utf8'),
  )
  assert(
    reviewed.candidateSha256 === values.approve,
    'approval does not match the local review',
  )
  const args = [
    'workflow',
    'run',
    'publish-release.yml',
    '--repo',
    repository,
    '--ref',
    'master',
    '-f',
    `candidate_run=${values.run}`,
    '-f',
    `candidate_sha256=${values.approve}`,
    '-f',
    `stores=${values.stores}`,
    '-f',
    `reconciled=${values.reconciled}`,
  ]
  if (values['metric-run'])
    args.push('-f', `metric_run=${values['metric-run']}`)
  if (values.notes) args.push('-F', `notes=@${resolve(values.notes)}`)
  gh(args)
  process.stdout.write(
    'Reviewed publication dispatched. Inspect individual store receipts; then import the report with pnpm release:reports --tag VERSION.\n',
  )
} else throw new Error(help)
