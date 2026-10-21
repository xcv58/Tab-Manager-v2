// Explicit local release measurement. Never uploads, tags, or submits stores.
import { parseArgs } from 'node:util'
import { URL } from 'node:url'
import console from 'node:console'
import { readFile, mkdir } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { platform, arch, release } from 'node:os'
import { verifiedCandidate, writeImmutable } from '../release/candidate.mjs'
import { reviewPublishedRelease } from '../release/publish.mjs'
import { previousRelease } from './sources.mjs'
import { measurePackage } from './bundles.mjs'
import { compareRevisions } from './compare.mjs'
import {
  git,
  json,
  sha256,
  writeRecord,
  readRecords,
  fileHash,
} from './records.mjs'
import { recordReport, buildViewer } from './reports.mjs'
import {
  readProfile,
  assertProfileHost,
  assertLocalMeasurement,
  measurementConditions,
  withMeasurementLock,
} from './environment.mjs'
import { readLocalCapture, importLocalCapture } from './local-capture.mjs'

async function main() {
  const { values } = parseArgs({
    options: {
      run: { type: 'string' },
      tag: { type: 'string' },
      output: { type: 'string' },
      input: { type: 'string' },
      import: { type: 'boolean', default: false },
      help: { type: 'boolean' },
    },
  })
  if (values.help) {
    process.stdout.write(
      'Usage: pnpm release:performance --run CANDIDATE_RUN | --tag vVERSION [--output DIR] [--import]\n       pnpm release:performance --input CAPTURE_JSON [--import]\nMeasures frozen packages and paired UI revisions locally using notes/performance/protocol.json. --import stages immutable data for normal PR review; it never commits, uploads, or publishes.\n',
    )
    return
  }
  assertLocalMeasurement()
  return withMeasurementLock(() => collect(values))
}

async function collect(values) {
  assertLocalMeasurement()
  if (values.input) {
    if (values.run || values.tag || values.output)
      throw new Error('--input cannot be combined with capture options')
    const path = resolve(values.input),
      records = join(dirname(path), 'runs')
    const result = values.import
      ? await importLocalCapture(path, records)
      : await readLocalCapture(path, records)
    process.stdout.write(
      `Validated ${result.capture.id}: ${result.records.length} records${values.import ? ' imported for PR review' : ''}.\n`,
    )
    return
  }
  if (
    Boolean(values.run) === Boolean(values.tag) ||
    (values.run && !/^\d+$/.test(values.run)) ||
    (values.tag && !/^v\d+\.\d+\.\d+$/.test(values.tag))
  )
    throw new Error('Supply exactly one --run ID or --tag vVERSION')
  if (git(['status', '--porcelain', '--untracked-files=no']))
    throw new Error(
      'Commit collector changes before measuring; use a clean worktree.',
    )
  git([
    'ls-files',
    '--error-unmatch',
    'scripts/performance/release.mjs',
    'scripts/performance/environment.mjs',
    'scripts/performance/local-capture.mjs',
    'notes/performance/protocol.json',
  ])
  const collectorCommit = git(['rev-parse', 'HEAD'])
  const profile = await readProfile()
  assertProfileHost(profile)
  const before = measurementConditions(profile)
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-')
  const id = `local-${profile.machineId}-${stamp}`
  const output = resolve(
    values.output || join('.tmp/releases', values.tag || values.run, id),
  )
  await mkdir(dirname(output), { recursive: true })
  await mkdir(output)
  const packages = join(output, 'packages')
  const verified = values.tag
    ? await reviewPublishedRelease(values.tag, packages)
    : await verifiedCandidate(values.run, packages)
  const { candidate, digest } = verified
  const target = candidate.source.commit
  // Local checkouts may predate the last publication. Read the canonical
  // repository's existing tags before choosing the previous release; never
  // create a remote tag or replace a conflicting local tag.
  git([
    'fetch',
    '--tags',
    '--no-recurse-submodules',
    'https://github.com/xcv58/Tab-Manager-v2.git',
  ])
  const baseline = previousRelease(target)
  const reference = git([
    'rev-parse',
    '--verify',
    '--end-of-options',
    `${profile.reference}^{commit}`,
  ])
  await writeImmutable(
    join(output, 'capture-start.json'),
    Buffer.from(
      json({
        id,
        candidate,
        candidateSha256: digest,
        collectorCommit,
        profile,
        baselineCommit: baseline,
        referenceCommit: reference,
        conditions: { before },
      }),
    ),
  )
  process.stdout.write(
    `Measuring ${candidate.source.tag} on ${profile.machineId}; target ${target}, baseline ${baseline}.\n`,
  )
  const recordsDirectory = join(output, 'runs')
  const source = {
    commit: target,
    version: candidate.source.version,
    committedAt: git(['show', '-s', '--format=%cI', target]),
    status: values.tag ? 'released' : 'candidate',
    tag: values.tag || null,
    label: values.tag
      ? candidate.source.version
      : `${candidate.source.version} candidate`,
    dirty: false,
  }
  const bundle = {
    schemaVersion: 1,
    id: `${id}-bundles`,
    recordedAt: new Date().toISOString(),
    source,
    provenance: {
      kind: 'local-reviewed-release-bundles',
      runner: `local:${platform()}:${arch()}`,
      repository: 'xcv58/Tab-Manager-v2',
      workflowRun: null,
      node: process.version,
      osVersion: release(),
      machineId: profile.machineId,
      candidateSha256: digest,
      collectorCommit,
      collectorSha256: await fileHash(
        new URL('./bundles.mjs', import.meta.url),
      ),
    },
    bundles: [],
    runtime: null,
  }
  for (const browser of ['chrome', 'firefox'])
    bundle.bundles.push(
      measurePackage(
        await readFile(join(packages, `build_${browser}.zip`)),
        browser,
        source.version,
      ),
    )
  await writeRecord(bundle, recordsDirectory)
  await compareRevisions({
    head: target,
    baseCommit: baseline,
    referenceCommit: reference,
    id,
    output,
    tabs: profile.tabs.join(','),
    samples: String(profile.samples),
    'drag-samples': String(profile.dragSamples),
    profile,
    checkConditions: () => measurementConditions(profile),
  })
  const after = measurementConditions(profile)
  if (
    git(['rev-parse', 'HEAD']) !== collectorCommit ||
    git(['status', '--porcelain', '--untracked-files=no'])
  )
    throw new Error(
      'Collector worktree changed during measurement; no complete capture will be imported.',
    )
  const records = await readRecords([recordsDirectory])
  const files = []
  for (const record of records) {
    const name = `${record.id}.json`,
      bytes = await readFile(join(recordsDirectory, name))
    files.push({ name, bytes: bytes.length, sha256: sha256(bytes) })
  }
  const capture = {
    schemaVersion: 1,
    kind: 'local-release-performance',
    id,
    recordedAt: new Date().toISOString(),
    candidateSha256: digest,
    candidate,
    collectorCommit,
    profile,
    baselineCommit: baseline,
    referenceCommit: reference,
    conditions: { before, after },
    files,
  }
  const manifest = join(output, 'capture.json')
  await writeImmutable(manifest, Buffer.from(json(capture)))
  await readLocalCapture(manifest, recordsDirectory, { candidate, digest })
  const history = await readRecords()
  const baselineBundle = history
    .filter(
      (record) => record.source.commit === baseline && record.bundles.length,
    )
    .at(-1)
  const report = records
    .map((record) =>
      recordReport(record, record.bundles.length ? baselineBundle : undefined),
    )
    .join('\n')
  await writeImmutable(join(output, 'review.md'), Buffer.from(report))
  await buildViewer([...history, ...records], join(output, 'viewer'))
  if (values.import) await importLocalCapture(manifest, recordsDirectory)
  process.stdout.write(
    `Complete local capture: ${manifest}\nReview: ${join(output, 'review.md')}\nPreview: pnpm preview:release-media "${join(output, 'viewer')}" 8780\n${values.import ? 'Immutable records imported for PR review.' : 'Nothing imported or uploaded; use the reviewed capture for an explicit import.'}\n`,
  )
}
if (process.argv[1] === import.meta.filename)
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
