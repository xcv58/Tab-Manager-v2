import { spawnSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { URL } from 'node:url'
import { releasedCandidate } from './publish.mjs'
import { assert, pages, repository, uploadImmutable } from './github.mjs'
import { sha256 } from '../performance/records.mjs'
import { checkpoint } from './journal.mjs'
import { readStoreReceipts, storeRetryDecision } from './store-receipts.mjs'
import { assertStoreAcceptance } from './store-acceptance.mjs'

const store = process.env.RELEASE_STORE
assert(
  process.env.GITHUB_REPOSITORY === repository &&
    process.env.GITHUB_REF_NAME === 'master',
  'store publisher must run on master',
)
assert(['chrome', 'firefox', 'edge'].includes(store), 'unknown store')
const directory = resolve('.tmp/store-package')
const { candidate, release } = await releasedCandidate(
  process.env.RELEASE_TAG,
  directory,
  process.env.CANDIDATE_SHA256,
)
const file = candidate.files.find(
  (file) =>
    file.name ===
    (store === 'firefox' ? 'build_firefox.zip' : 'build_chrome.zip'),
)
process.env.RELEASE_SOURCE = candidate.source.commit
process.env.RELEASE_PACKAGE_SHA256 = file.sha256
process.env.RELEASE_VERSION = candidate.source.version
process.env.RELEASE_ACCEPTANCE_PATH = join(
  directory,
  `${store}-acceptance-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}.json`,
)
process.env.RELEASE_JOURNAL_DIR = resolve('.tmp/store-receipts')
const previous = await readStoreReceipts(
  await pages(`releases/${release.id}/assets`),
  store,
  candidate,
  process.env.CANDIDATE_SHA256,
)
if (
  storeRetryDecision(previous, process.env.RELEASE_RECONCILED === 'true') ===
  'skip'
) {
  process.stdout.write(
    `${store} already submitted these exact packages; no new store request.\n`,
  )
  process.exit(0)
}
const build = resolve('packages/extension/build')
await mkdir(build, { recursive: true })
for (const packageFile of candidate.files)
  await cp(join(directory, packageFile.name), join(build, packageFile.name))
if (store === 'firefox') {
  const result = spawnSync(
    'unzip',
    [
      '-q',
      join(build, 'build_firefox.zip'),
      '-d',
      join(build, 'build_firefox'),
    ],
    { stdio: 'inherit' },
  )
  assert(result.status === 0, 'cannot expand Firefox package')
}
await checkpoint('started')
const args =
  store === 'firefox'
    ? [
        'exec',
        'web-ext',
        'sign',
        '--source-dir',
        'packages/extension/build/build_firefox',
        '--channel=listed',
        '--upload-source-code',
        'packages/extension/build/build_firefox_source.zip',
        '--approval-timeout',
        '0',
        '--artifacts-dir',
        '.tmp/firefox-signed',
      ]
    : [`publish_${store}.mjs`]
// Child checkpoint sequence starts after the durable "started" receipt.
const result = spawnSync(store === 'firefox' ? 'pnpm' : 'node', args, {
  stdio: 'inherit',
  env: { ...process.env, RELEASE_JOURNAL_SEQUENCE: '1' },
})
// Reserve a separate sequence range so a child checkpoint can never be clobbered.
process.env.RELEASE_JOURNAL_SEQUENCE = '900'
let acceptance
try {
  assert(result.status === 0, 'store publisher did not finish successfully')
  if (store === 'firefox') {
    // In this pinned web-ext version, zero exit follows validation, version
    // creation and source upload. approval-timeout=0 skips approval waiting.
    const tool = JSON.parse(
      await readFile(
        new URL('../../node_modules/web-ext/package.json', import.meta.url),
        'utf8',
      ),
    )
    acceptance = {
      schemaVersion: 1,
      store,
      version: candidate.source.version,
      packageSha256: file.sha256,
      tool: 'web-ext',
      toolVersion: tool.version,
      channel: 'listed',
      approvalTimeout: 0,
    }
  } else {
    acceptance = JSON.parse(
      await readFile(process.env.RELEASE_ACCEPTANCE_PATH, 'utf8'),
    )
  }
  assertStoreAcceptance(acceptance, {
    store,
    version: candidate.source.version,
    packageSha256: file.sha256,
  })
} catch (error) {
  await checkpoint('unknown', {
    exitCode: result.status,
    reason: `Acceptance could not be verified: ${error.message}. Inspect store status and operation receipts before retrying.`,
  })
  throw new Error(
    `${store} submission acceptance is unknown; outcome requires reconciliation`,
    { cause: error },
  )
}
const signed = []
if (store === 'firefox') {
  let names = []
  try {
    names = await readdir('.tmp/firefox-signed')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  for (const name of names.filter((name) => /\.(xpi|zip)$/.test(name))) {
    const path = join('.tmp/firefox-signed', name),
      bytes = await readFile(path)
    const assetName = `firefox-signed-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}-${name}`
    // uploadImmutable uses the local basename as the remote name; copy explicitly.
    const target = join(directory, assetName)
    await cp(path, target)
    await uploadImmutable(candidate.source.tag, target)
    signed.push({ name: assetName, bytes: bytes.length, sha256: sha256(bytes) })
  }
}
await checkpoint('submitted', {
  acceptance,
  signedOutputs: signed,
  note: 'Submitted; review and public availability require separate verification.',
})
