import { parseArgs } from 'node:util'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  assert,
  gh,
  repository,
  request,
  optionalRelease,
  pages,
} from './github.mjs'
import {
  verifiedCandidate,
  validateCandidate,
  commitPattern,
  hashPattern,
} from './candidate.mjs'
import { candidatePreview } from './preview.mjs'
import {
  reviewPublishedRelease,
  releasedCandidate,
  releaseStores,
  assertNewReleaseVersion,
} from './publish.mjs'
import { assertReleaseRemote, pushReleaseTag } from './tag.mjs'
import { safariNotesPath, validateSafariNotes } from './safari-model.mjs'
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
    safari: { type: 'boolean', default: false },
    'safari-notes': { type: 'string' },
    action: { type: 'string', default: 'status' },
    'metadata-sha256': { type: 'string' },
    help: { type: 'boolean' },
  },
})
const [command] = positionals
const help = `Local release driver (no store credentials needed locally):
  pnpm release:prepare --version 3.0.2 --notes /absolute/path/notes.md [--safari-notes /absolute/path/localized-notes.json]
  # Review/version changes through the normal Git workflow, then freeze merged SHA:
  pnpm release:verify --sha FULL_MASTER_COMMIT [--safari]
  pnpm release:review --run CANDIDATE_RUN_ID
  pnpm release:performance --run CANDIDATE_RUN_ID --import
  pnpm release:review --tag v3.0.1  # recover a published review after CI artifacts expire
  pnpm release:publish --run CANDIDATE_RUN_ID --approve REVIEWED_CANDIDATE_SHA256
  # Resume only selected unfinished stores, or archive reviewed evidence:
  pnpm release:publish --run RUN --approve SHA256 --stores edge [--reconciled]
  pnpm release:publish --run RUN --approve SHA256 --stores none
  pnpm release:publish --run RUN --approve SHA256 --stores safari [--reconciled]
  pnpm release:safari --tag v3.0.2 --approve SHA256 --action status|prepare
  pnpm release:safari --tag v3.0.2 --approve SHA256 --action submit --metadata-sha256 REVIEWED_APPLE_METADATA_DIGEST
  pnpm release:reports --tag v3.0.1
  pnpm build:site

Preparation edits version/changelog files locally. Verification dispatches CI.
Review downloads immutable packages and prints required check outcomes.
Publishing requires the exact locally reviewed digest; --reconciled means you
checked the store and its archived operation IDs before retrying an uncertain attempt.
After rechecking gates, publishing pushes the final version tag through existing
Git authentication and dispatches CI. Matching tags are reused, never moved.
Performance is measured locally; CI validates and archives reviewed captures.
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
  const safariNotes = values['safari-notes']
    ? validateSafariNotes(
        JSON.parse(await readFile(resolve(values['safari-notes']), 'utf8')),
      )
    : null
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
  if (safariNotes) {
    const path = resolve(safariNotesPath(version))
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, json(safariNotes), { flag: 'wx' })
  }
  process.stdout.write(
    `Prepared ${version}. Review git diff, commit and merge through normal review. No release was published.\n`,
  )
} else if (command === 'verify') {
  assert(
    commitPattern.test(values.sha || ''),
    '--sha must be the full reviewed current master commit',
  )
  assert(
    (await request('commits/master')).sha === values.sha,
    'master changed; review its current SHA, or reuse an already prepared candidate run',
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
    `safari=${values.safari}`,
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
  if (candidate.safari)
    process.stdout.write(
      `\nSafari: ${JSON.stringify(candidate.safari, null, 2)}\n`,
    )
  process.stdout.write(
    preview
      ? `\nCandidate report: ${preview}\nServe it with: pnpm preview:release-media "${preview}" 8782\nOpen http://127.0.0.1:8782/?candidates=1&target=${candidate.source.commit}\nCollect performance locally with pnpm release:performance --run ${candidate.build.runId}. Missing measurements remain explicit.\nReview source, packages and report before approving publication.\n`
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
  const stores = releaseStores(values.stores)
  assert(
    !stores.includes('safari') || reviewed.candidate.safari,
    'Safari was not included in the reviewed candidate',
  )
  if (values.notes) await readFile(resolve(values.notes), 'utf8')
  assertReleaseRemote()
  const source = validateCandidate(reviewed.candidate).source
  const release = await optionalRelease(source.tag)
  const directory = await mkdtemp(
    resolve('.tmp/releases', values.run, 'publish-'),
  )
  const verified =
    release && !release.draft
      ? await releasedCandidate(source.tag, directory, values.approve)
      : await verifiedCandidate(values.run, directory, values.approve)
  const candidate = verified.candidate
  assert(
    String(candidate.build.runId) === values.run,
    'candidate run differs from approval',
  )
  if (!release || release.draft) {
    assert(
      !release || release.target_commitish === candidate.source.commit,
      'draft release belongs to a different candidate',
    )
    assertNewReleaseVersion(candidate, await pages('releases'))
    const comparison = await request(
      `compare/${candidate.source.commit}...master`,
    )
    assert(
      ['ahead', 'identical'].includes(comparison.status),
      'candidate is not on master',
    )
  }
  const createdTag = pushReleaseTag(candidate.source)
  process.stdout.write(
    `${createdTag ? 'Pushed' : 'Reused'} ${candidate.source.tag} at ${candidate.source.commit}.\n`,
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
  try {
    gh(args)
  } catch (error) {
    throw new Error(
      `Publication dispatch failed after verifying ${candidate.source.tag}. Retry the same approved command; its matching tag will be reused.`,
      { cause: error },
    )
  }
  process.stdout.write(
    'Reviewed publication dispatched. Inspect individual store receipts; then import the report with pnpm release:reports --tag VERSION.\n',
  )
} else if (command === 'safari') {
  assert(
    /^v\d+\.\d+\.\d+$/.test(values.tag || '') &&
      hashPattern.test(values.approve || ''),
    '--tag and --approve reviewed candidate digest are required',
  )
  assert(
    ['status', 'prepare', 'submit'].includes(values.action),
    'unknown Safari control',
  )
  assert(
    values.action !== 'submit' ||
      hashPattern.test(values['metadata-sha256'] || ''),
    'submission needs the reviewed Apple metadata digest',
  )
  await mkdir(resolve('.tmp'), { recursive: true })
  const directory = await mkdtemp(resolve('.tmp/safari-control-'))
  const { candidate } = await releasedCandidate(
    values.tag,
    directory,
    values.approve,
  )
  assert(candidate.safari, 'published candidate does not include Safari')
  const reviewed = JSON.parse(
    await readFile(
      resolve('.tmp/releases', String(candidate.build.runId), 'review.json'),
      'utf8',
    ),
  )
  assert(
    reviewed.candidateSha256 === values.approve,
    'review the published candidate with release:review --tag before applying Safari controls',
  )
  const args = [
    'workflow',
    'run',
    'safari-app-store.yml',
    '--repo',
    repository,
    '--ref',
    'master',
    '-f',
    `tag=${values.tag}`,
    '-f',
    `candidate_sha256=${values.approve}`,
    '-f',
    `action=${values.action}`,
  ]
  if (values['metadata-sha256'])
    args.push('-f', `metadata_sha256=${values['metadata-sha256']}`)
  gh(args)
  process.stdout.write(
    `Safari ${values.action} dispatched for the recorded build. Release remains manual.\n`,
  )
} else throw new Error(help)
