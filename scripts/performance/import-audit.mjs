import console from 'node:console'
// One-time, explicit import of the measured October 20 comparison. Original
// capture fields are preserved; missing contemporaneous provenance stays null.
import { parseArgs } from 'node:util'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  archiveDirectory,
  repositoryRoot,
  git,
  sha256,
  fileHash,
  writeRecord,
} from './records.mjs'

const { values } = parseArgs({ options: { input: { type: 'string' } } })
if (!values.input)
  throw new Error('Use --input with the original comparison directory')
const input = resolve(values.input)
const load = async (name) =>
  JSON.parse(await readFile(join(input, name), 'utf8'))
const runtime = await load('runtime-raw.json')
const drags = await load('drag-raw.json')
const bundles = await load('bundle-sizes.json')
const verification = await load('published-2.7.2/rebuild-verification.json')
if (
  runtime.samples.length !== 63 ||
  drags.length !== 9 ||
  runtime.errors.length
)
  throw new Error('Expected the complete, passing three-version audit')
const evidenceRoot = join(repositoryRoot, 'notes/performance/audits/2026-10-20')
await mkdir(evidenceRoot, { recursive: true })
const evidence = []
for (const [source, name] of [
  [join(input, 'profile-runtime.cjs'), 'capture-runtime.cjs.txt'],
  [join(input, 'profile-drag.cjs'), 'capture-drag.cjs.txt'],
  [join(input, 'measure-bundles.cjs'), 'capture-bundles.cjs.txt'],
  [
    join(input, 'master/packages/extension/utils/profile.js'),
    'profile-builder.js.txt',
  ],
  [
    join(input, 'master/packages/integration_test/assets/profiling/entry.tsx'),
    'profile-entry.tsx.txt',
  ],
  [
    join(
      input,
      'master/packages/integration_test/assets/profiling/fixtures.ts',
    ),
    'profile-fixtures.ts.txt',
  ],
]) {
  const destination = join(evidenceRoot, name)
  const bytes = await readFile(source)
  try {
    await writeFile(destination, bytes, { flag: 'wx' })
  } catch (error) {
    if (error.code !== 'EEXIST' || !(await readFile(destination)).equals(bytes))
      throw new Error(`Refusing to overwrite audit evidence: ${destination}`)
  }
  evidence.push({
    file: `notes/performance/audits/2026-10-20/${name}`,
    sha256: await fileHash(destination),
  })
}
const compatibilityKey = sha256(
  JSON.stringify({
    audit: '2026-10-20-local-macos',
    environment: runtime.environment,
    evidence,
  }),
)
for (const [key, commit, status, tag] of [
  ['legacy', '3cd88a06e2936a5764a96e0d353b3ed08a78aeaf', 'released', 'v2.7.2'],
  ['release', 'c2dea3aacb3c1fb871434bdcbbcf54019b03f602', 'released', null],
  ['master', '3e7a511dd7197169d4288ac158c390ec9ee02e45', 'candidate', null],
]) {
  const pkg = JSON.parse(
    git(['show', `${commit}:packages/extension/package.json`]),
  )
  const record = {
    schemaVersion: 1,
    id: `2026-10-20-macos-${commit.slice(0, 8)}`,
    recordedAt: '2026-10-20',
    source: {
      commit,
      committedAt: git(['show', '-s', '--format=%cI', commit]),
      version: pkg.version,
      label:
        status === 'released'
          ? pkg.version
          : `3.0.0 candidate @ ${commit.slice(0, 8)}`,
      status,
      tag,
      dirty: false,
    },
    provenance: {
      kind: 'retrospective-audit-import',
      repository: 'xcv58/Tab-Manager-v2',
      runner: 'local:darwin:arm64',
      os: 'darwin',
      osVersion: '27.2',
      arch: 'arm64',
      node: runtime.environment.node,
      lockfileSha256: sha256(git(['show', `${commit}:pnpm-lock.yaml`]) + '\n'),
      evidence,
      report: 'notes/performance/reports/2026-10-20-comparison.md',
      note: 'Source exports were frozen at capture. Driver hashes were recorded during archival, not signed at measurement time. Concrete fixture fingerprints and machine CPU model were not captured.',
      publishedRebuildVerification: key === 'legacy' ? verification : null,
    },
    bundles: [],
    runtime: {
      compatibilityKey,
      environment: {
        ...runtime.environment,
        osVersion: '27.2',
        runner: 'local:darwin:arm64',
      },
      fixtureFingerprints: null,
      samples: runtime.samples.filter((sample) => sample.revision === key),
      drags: drags.filter((sample) => sample.revision === key),
      errors: [],
    },
  }
  for (const browser of ['chrome', 'firefox']) {
    const original = bundles[key][browser]
    const files = original.files
      .map(({ name, ...file }) => ({ path: name, ...file }))
      .sort((a, b) => a.path.localeCompare(b.path, 'en'))
    const summary = { ...original }
    delete summary.files
    record.bundles.push({
      browser,
      zip: {
        bytes: original.zipBytes,
        sha256: await fileHash(join(input, `${key}-${browser}.zip`)),
      },
      contentSha256: sha256(
        files
          .map((file) => `${file.path}\0${file.bytes}\0${file.sha256}\n`)
          .join(''),
      ),
      files,
      summary,
    })
  }
  console.log(await writeRecord(record, archiveDirectory))
}
