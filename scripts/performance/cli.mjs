import { URL } from 'node:url'
import console from 'node:console'
import { parseArgs } from 'node:util'
import { join, resolve } from 'node:path'
import { readFile, appendFile } from 'node:fs/promises'
import { platform, arch, release } from 'node:os'
import {
  archiveDirectory,
  repositoryRoot,
  git,
  fileHash,
  sha256,
  readRecords,
  writeRecord,
  writeText,
} from './records.mjs'
import { collectBundle } from './bundles.mjs'
import { recordReport, buildViewer } from './reports.mjs'
import { previousRelease } from './sources.mjs'
import { startMediaPreview } from '../preview-release-media.mjs'
export { previousRelease } from './sources.mjs'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    input: { type: 'string', multiple: true },
    output: { type: 'string' },
    port: { type: 'string', default: '8780' },
    id: { type: 'string' },
    status: { type: 'string', default: 'candidate' },
    tag: { type: 'string' },
    base: { type: 'string', default: 'auto' },
    head: { type: 'string', default: 'HEAD' },
    revisions: { type: 'string' },
    reference: {
      type: 'string',
      default: 'c2dea3aacb3c1fb871434bdcbbcf54019b03f602',
    },
    samples: { type: 'string', default: '7' },
    'drag-samples': { type: 'string', default: '3' },
    tabs: { type: 'string', default: '100,1000,5000' },
    executable: { type: 'string' },
    help: { type: 'boolean' },
  },
})

export function sourceMetadata(
  ref = 'HEAD',
  status = 'candidate',
  tag = null,
  cwd = repositoryRoot,
) {
  const commit = git(['rev-parse', '--verify', `${ref}^{commit}`], cwd)
  const pkg = JSON.parse(
    git(['show', `${commit}:packages/extension/package.json`], cwd),
  )
  const dirty =
    ref === 'HEAD' &&
    Boolean(git(['status', '--porcelain', '--untracked-files=no'], cwd))
  return {
    commit,
    committedAt: git(['show', '-s', '--format=%cI', commit], cwd),
    version: pkg.version,
    label:
      status === 'released'
        ? pkg.version
        : `${pkg.version} candidate @ ${commit.slice(0, 8)}`,
    status,
    tag,
    dirty,
  }
}

async function main() {
  const command = positionals[0]
  if (values.help || !command) {
    console.log(
      `Performance history (no test runner)\n\n  build [--input FILE_OR_RUNS_DIR] [--output dist/performance]\n  preview [--input FILE_OR_RUNS_DIR] [--port 8780]\n  collect [--id ID] [--status candidate|released] [--tag vX.Y.Z]\n  compare [--head REF] [--base auto|REF] [--samples 7] [--drag-samples 3]\n          [--reference REF] [--revisions REF,REF,...]\n          [--tabs 100,1000,5000] [--executable CHROME_PATH]\n  archive --input FILE_OR_RUNS_DIR\n\ncollect requires current pnpm build + pnpm zip output.\ncompare builds frozen revisions plus a fixed reference and runs isolated browser profiling.\nDefault output: .tmp/performance-results (collect/compare).\nDefault records: notes/performance/runs. Records are immutable.\n`,
    )
    return
  }
  const output = resolve(
    values.output ||
      (['build', 'preview'].includes(command)
        ? 'dist/performance'
        : '.tmp/performance-results'),
  )
  if (['build', 'preview', 'archive'].includes(command)) {
    const inputs = values.input?.map((path) => resolve(path)) || []
    if (command === 'archive') {
      if (!inputs.length) throw new Error('archive requires --input')
      const records = await readRecords(inputs)
      if (!records.length) throw new Error('Input contains no records')
      for (const record of records)
        console.log(await writeRecord(record, archiveDirectory))
      return
    }
    const records = await readRecords([archiveDirectory, ...inputs])
    const page = await buildViewer(records, output)
    console.log(`History: ${page}`)
    if (command === 'preview') {
      const port = Number(values.port)
      if (!Number.isInteger(port) || port < 0 || port > 65535)
        throw new Error('Invalid port')
      const server = await startMediaPreview(output, port)
      console.log(
        `Performance history: http://127.0.0.1:${server.address().port}/`,
      )
      for (const signal of ['SIGINT', 'SIGTERM'])
        process.once(signal, () => server.close())
    }
    return
  }
  if (command === 'collect') {
    if (!['released', 'candidate'].includes(values.status))
      throw new Error('Invalid status')
    const source = sourceMetadata('HEAD', values.status, values.tag || null)
    if (
      values.tag &&
      (source.dirty ||
        git(['rev-parse', '--verify', `${values.tag}^{commit}`]) !==
          source.commit ||
        values.tag !== `v${source.version}`)
    )
      throw new Error(
        'Release record requires a clean checkout of the matching version tag',
      )
    const id =
      values.id ||
      `bundle-${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${source.commit.slice(0, 8)}`
    const record = {
      schemaVersion: 1,
      id,
      recordedAt: new Date().toISOString(),
      source,
      provenance: {
        kind: 'packaged-bundles',
        repository: 'xcv58/Tab-Manager-v2',
        runner: process.env.RUNNER_ENVIRONMENT
          ? `${process.env.RUNNER_ENVIRONMENT}:${process.env.RUNNER_OS}:${process.env.RUNNER_ARCH}`
          : `local:${platform()}:${arch()}`,
        os: platform(),
        osVersion: release(),
        arch: arch(),
        node: process.version,
        lockfileSha256: await fileHash(join(repositoryRoot, 'pnpm-lock.yaml')),
        collectorSha256: sha256(
          await readFile(new URL('./bundles.mjs', import.meta.url)),
        ),
        workflowRun: process.env.GITHUB_RUN_ID || null,
      },
      bundles: [],
      runtime: null,
    }
    for (const browser of ['chrome', 'firefox'])
      record.bundles.push(
        await collectBundle(
          join(repositoryRoot, 'packages/extension'),
          browser,
          source.version,
        ),
      )
    let baselineCommit = null
    try {
      baselineCommit = previousRelease('HEAD', values.base)
    } catch (error) {
      if (values.base !== 'auto') throw error
    }
    const baseline = (await readRecords())
      .filter(
        (item) => item.source.commit === baselineCommit && item.bundles.length,
      )
      .at(-1)
    record.comparisonBaseline = {
      commit: baselineCommit,
      recordId: baseline?.id || null,
    }
    const path = await writeRecord(record, join(output, 'runs'))
    const report = recordReport(record, baseline)
    await writeText(join(output, `${id}.md`), report)
    if (process.env.GITHUB_STEP_SUMMARY)
      await appendFile(process.env.GITHUB_STEP_SUMMARY, report)
    console.log(path)
    return
  }
  if (command === 'compare') {
    const { compareRevisions } = await import('./compare.mjs')
    await compareRevisions({
      ...values,
      output,
      baseCommit: previousRelease(values.head, values.base),
      referenceCommit: git([
        'rev-parse',
        '--verify',
        `${values.reference}^{commit}`,
      ]),
    })
    return
  }
  throw new Error(`Unknown command: ${command}`)
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
)
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
