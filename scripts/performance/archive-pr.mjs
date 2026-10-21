import console from 'node:console'
// Runs only in the archive job, with trusted tools checked out from master.
// Artifact JSON is validated data, never executed as scripts or shell text.
import { parseArgs } from 'node:util'
import { execFileSync } from 'node:child_process'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import {
  archiveDirectory,
  repositoryRoot,
  readRecords,
  writeRecord,
} from './records.mjs'

const { values } = parseArgs({
  options: { input: { type: 'string' }, branch: { type: 'string' } },
})
if (
  !values.input ||
  !values.branch ||
  !/^automation\/performance-[\w-]+$/.test(values.branch)
)
  throw new Error('Expected --input and a safe automation/performance-* branch')
if (process.env.GITHUB_ACTIONS !== 'true')
  throw new Error(
    'This publisher is CI-only. Use performance:archive for a local import.',
  )
const exec = (command, args) =>
  execFileSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
const records = await readRecords([values.input])
if (!records.length) throw new Error('No records to archive')
for (const record of records)
  if (
    record.source.dirty ||
    record.provenance.workflowRun !== process.env.GITHUB_RUN_ID ||
    !['packaged-bundles', 'matched-runtime-comparison'].includes(
      record.provenance.kind,
    )
  )
    throw new Error(
      'Only complete, clean records produced by this workflow run may be published automatically',
    )
for (const record of records) await writeRecord(record, archiveDirectory)
const paths = records.map((record) =>
  relative(repositoryRoot, join(archiveDirectory, `${record.id}.json`)),
)
if (!exec('git', ['status', '--porcelain', '--', ...paths])) {
  console.log('These immutable records are already archived.')
} else {
  const directory = await mkdtemp(join(tmpdir(), 'performance-pr-'))
  try {
    exec('git', ['switch', '-c', values.branch])
    exec('git', ['add', '--', ...paths])
    exec('git', [
      '-c',
      'user.name=github-actions[bot]',
      '-c',
      'user.email=41898282+github-actions[bot]@users.noreply.github.com',
      'commit',
      '-m',
      'chore(performance): archive measured release records',
    ])
    exec('gh', ['auth', 'setup-git'])
    exec('git', ['push', '--set-upstream', 'origin', values.branch])
    const body = join(directory, 'body.md')
    await writeFile(
      body,
      `## Summary\n\nArchive ${records.length} immutable performance record(s) produced by workflow run ${process.env.GITHUB_RUN_ID}. Measurements identify frozen source commits and preserve raw observations; timing deltas remain advisory.\n\n${records.map((record) => `- ${record.id}: ${record.source.commit}`).join('\n')}\n\n## Testing\n\n- Parsed and validated each record before archival.\n- No application source changes.\n\n## Release Notes\n\nData-only archive; no extension release requested.\n`,
    )
    // gh rejects --template with --body-file, and --editor requires a TTY.
    // Create a draft noninteractively, then populate the template's sections
    // from the prepared body file. This also works in GitHub Actions.
    const url = exec('gh', [
      'pr',
      'create',
      '--draft',
      '--base',
      process.env.ARCHIVE_BASE_BRANCH || 'master',
      '--head',
      values.branch,
      '--title',
      'chore(performance): archive measured release records',
      '--template',
      '.github/PULL_REQUEST_TEMPLATE.md',
      '--fill',
    ])
    exec('gh', ['pr', 'edit', url, '--body-file', body])
    console.log(url)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
