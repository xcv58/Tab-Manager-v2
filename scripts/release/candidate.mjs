import { execFileSync } from 'node:child_process'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { assertReleaseVersion, readReleaseVersion } from '../release-policy.mjs'
import { git, json, sha256 } from '../performance/records.mjs'
import { assert, gh, pages, request, repository } from './github.mjs'

export const packageNames = [
  'build_chrome.zip',
  'build_firefox.zip',
  'build_firefox_source.zip',
]
export const requiredJobs = [
  'Freeze candidate',
  'Build candidate packages',
  'Verify Chrome package',
  'Verify Firefox package',
  'Safari Debug build',
  'Safari Release build',
]
export const hashPattern = /^[a-f0-9]{64}$/
export const commitPattern = /^[a-f0-9]{40}$/
export function assertRequiredJobs(jobs) {
  for (const name of requiredJobs) {
    const matches = jobs.filter(
      (job) => job.name === name || job.name.endsWith(` / ${name}`),
    )
    assert(
      matches.length === 1 && matches[0].conclusion === 'success',
      `required check is not successful: ${name}`,
    )
  }
}
export async function writeImmutable(path, bytes) {
  try {
    await writeFile(path, bytes, { flag: 'wx' })
  } catch (error) {
    if (
      error.code !== 'EEXIST' ||
      !Buffer.from(await readFile(path)).equals(Buffer.from(bytes))
    )
      throw new Error(`Refusing to change immutable file ${path}`, {
        cause: error,
      })
  }
}
export async function trustedRun(id, workflow) {
  assert(/^\d+$/.test(String(id)), 'invalid run ID')
  const run = await request(`actions/runs/${id}`)
  assert(
    run.path === `.github/workflows/${workflow}` &&
      run.head_branch === 'master' &&
      run.event === 'workflow_dispatch' &&
      commitPattern.test(run.head_sha),
    'run is not a trusted default-branch dispatch',
  )
  return run
}
export async function verifiedCandidate(
  runId,
  directory,
  expectedDigest,
  { gate = true } = {},
) {
  const run = await trustedRun(runId, 'release-candidate.yml')
  const name = `release-candidate-${run.id}-${run.run_attempt}`
  const artifact = (await pages(`actions/runs/${run.id}/artifacts`)).find(
    (item) => item.name === name && !item.expired,
  )
  assert(
    artifact,
    `candidate packages for attempt ${run.run_attempt} are unavailable or expired. ` +
      'If packaging is still running, wait for it to finish. Otherwise choose "Re-run all jobs" for this candidate workflow, ' +
      `then run "pnpm release:review --run ${run.id}" and approve the new reviewed digest. ` +
      '"Re-run failed jobs" cannot recover packages from an earlier attempt. ' +
      'If the workflow can no longer be rerun, prepare a new candidate.',
  )
  await mkdir(directory, { recursive: true })
  gh([
    'run',
    'download',
    String(run.id),
    '--repo',
    repository,
    '--name',
    name,
    '--dir',
    directory,
  ])
  const bytes = await readFile(join(directory, 'candidate.json'))
  const digest = sha256(bytes)
  if (expectedDigest)
    assert(
      hashPattern.test(expectedDigest) && expectedDigest === digest,
      'candidate differs from the reviewed manifest',
    )
  const candidate = JSON.parse(bytes)
  validateCandidate(candidate)
  assert(
    String(candidate.build.runId) === String(run.id) &&
      candidate.build.attempt === run.run_attempt &&
      candidate.build.controllerCommit === run.head_sha,
    'candidate run/attempt identity mismatch',
  )
  await verifyPackages(candidate, directory)
  const jobs = await pages(
    `actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`,
  )
  if (gate) assertRequiredJobs(jobs)
  return { candidate, digest, run, jobs }
}
export function validateCandidate(candidate) {
  assert(
    candidate.schemaVersion === 1 && candidate.kind === 'release-candidate',
    'invalid candidate manifest',
  )
  assert(
    commitPattern.test(candidate.source?.commit),
    'invalid candidate source',
  )
  assertReleaseVersion(candidate.source.version)
  assert(
    candidate.source.tag === `v${candidate.source.version}`,
    'candidate version/tag mismatch',
  )
  assert(
    /^\d+$/.test(String(candidate.build?.runId)) &&
      Number.isSafeInteger(candidate.build.attempt) &&
      candidate.build.attempt >= 1 &&
      commitPattern.test(candidate.build.controllerCommit),
    'invalid candidate build receipt',
  )
  assert(
    Array.isArray(candidate.files) &&
      candidate.files.length === packageNames.length,
    'invalid package inventory',
  )
  for (const name of packageNames) {
    const files = candidate.files.filter((file) => file.name === name)
    assert(
      files.length === 1 &&
        hashPattern.test(files[0].sha256) &&
        Number.isSafeInteger(files[0].bytes) &&
        files[0].bytes > 0,
      `invalid package ${name}`,
    )
  }
  return candidate
}
export async function verifyPackages(candidate, directory) {
  validateCandidate(candidate)
  for (const file of candidate.files) {
    const path = join(directory, file.name),
      bytes = await readFile(path)
    assert(
      sha256(bytes) === file.sha256 && bytes.length === file.bytes,
      `package changed: ${file.name}`,
    )
    const entries = execFileSync('unzip', ['-Z1', path], { encoding: 'utf8' })
      .trim()
      .split('\n')
    assert(
      entries.every(
        (entry) =>
          !entry.startsWith('/') &&
          !entry.includes('\\') &&
          !entry.split('/').includes('..'),
      ),
      'unsafe ZIP entry',
    )
    if (file.name !== 'build_firefox_source.zip') {
      const manifest = JSON.parse(
        execFileSync('unzip', ['-p', path, 'manifest.json'], {
          encoding: 'utf8',
        }),
      )
      assert(
        manifest.version === candidate.source.version,
        `packaged version differs: ${file.name}`,
      )
    }
  }
}
async function main() {
  const [command, input] = process.argv.slice(2)
  if (command === 'freeze') {
    assert(
      commitPattern.test(input || ''),
      'candidate must be a full commit SHA',
    )
    assert(
      input === process.env.GITHUB_SHA && input === git(['rev-parse', 'HEAD']),
      'candidate must match the reviewed master revision at workflow dispatch; reuse an existing run for an older frozen candidate',
    )
    const version = assertReleaseVersion(
      JSON.parse(git(['show', `${input}:packages/extension/package.json`]))
        .version,
    )
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `commit=${input}\nversion=${version}\n`,
    )
  } else if (command === 'package') {
    assert(
      !git(['status', '--porcelain', '--untracked-files=no']),
      'candidate source changed during packaging',
    )
    const version = assertReleaseVersion(readReleaseVersion())
    const directory = resolve('packages/extension/build')
    const files = []
    for (const name of packageNames) {
      const bytes = await readFile(join(directory, name))
      files.push({ name, bytes: bytes.length, sha256: sha256(bytes) })
    }
    const candidate = {
      schemaVersion: 1,
      kind: 'release-candidate',
      source: {
        commit: git(['rev-parse', 'HEAD']),
        version,
        tag: `v${version}`,
      },
      build: {
        runId: process.env.GITHUB_RUN_ID,
        attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
        controllerCommit: process.env.GITHUB_SHA,
      },
      files,
    }
    await verifyPackages(candidate, directory)
    await writeFile(join(directory, 'candidate.json'), json(candidate))
    await writeFile(
      join(directory, 'SHA256SUMS.txt'),
      files.map((file) => `${file.sha256}  ${file.name}\n`).join(''),
    )
  } else throw new Error('Usage: candidate.mjs freeze SHA | package')
}
if (process.argv[1] === import.meta.filename) await main()
