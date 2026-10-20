import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { URL } from 'node:url'

const githubModule = new URL('./github.mjs', import.meta.url).href
const publishModule = new URL('./publish.mjs', import.meta.url).href
const receiptsModule = new URL('./store-receipts.mjs', import.meta.url).href
const reportsModule = new URL('../reports/import.mjs', import.meta.url).href
const metricModule = new URL('./metric-artifact.mjs', import.meta.url).href
const repo = 'repos/xcv58/Tab-Manager-v2'
const upload =
  'https://uploads.github.com/repos/xcv58/Tab-Manager-v2/releases/41/assets?name=package.zip'
const draft = { id: 41, tag_name: 'v3.0.1', draft: true }
const uploaded = {
  id: 51,
  name: 'package.zip',
  state: 'uploaded',
  size: 20,
  uploader: { login: 'github-actions[bot]' },
}
const starter = { ...uploaded, state: 'starter', size: 0 }

// Each child can invoke only this fake gh executable, with a finite ordered
// inventory of expected API responses. No GitHub credentials or network needed.
async function scenario(t, responses, code) {
  const directory = await mkdtemp(join(tmpdir(), 'release-github-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await writeFile(join(directory, 'responses.json'), JSON.stringify(responses))
  await writeFile(join(directory, 'calls.json'), '[]')
  await writeFile(join(directory, 'package.zip'), 'frozen package bytes')
  await writeFile(
    join(directory, 'gh'),
    `#!${process.execPath}
const fs = require('node:fs')
const assert = require('node:assert/strict')
const args = process.argv.slice(2)
assert.equal(args[0], 'api')
let calls = []
try { calls = JSON.parse(fs.readFileSync('calls.json')) } catch (error) { if (error.code !== 'ENOENT') throw error }
const response = JSON.parse(fs.readFileSync('responses.json'))[calls.length]
assert.ok(response, 'unexpected API request')
const methodIndex = args.indexOf('--method')
const method = methodIndex < 0 ? 'GET' : args[methodIndex + 1]
const path = methodIndex < 0 ? args[1] : args[methodIndex + 2]
assert.equal(method, response.method || 'GET')
assert.equal(path, response.path)
if (method === 'POST') {
  assert.equal(args[args.indexOf('-H') + 1], 'Content-Type: application/octet-stream')
  assert.equal(fs.readFileSync(args[args.indexOf('--input') + 1], 'utf8'), 'frozen package bytes')
}
calls.push(args)
fs.writeFileSync('calls.json', JSON.stringify(calls))
if (response.error) { process.stderr.write(response.error); process.exit(1) }
process.stdout.write(response.bytes === undefined ? response.json === undefined ? '' : JSON.stringify(response.json) : response.bytes)
`,
    { mode: 0o755 },
  )
  const result = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `const { optionalRelease, uploadImmutable, completedAsset, readJsonAsset } = await import(${JSON.stringify(githubModule)}); const { publicationReceipt } = await import(${JSON.stringify(publishModule)}); const { readStoreReceipts, storeRetryDecision, summarizeStoreReceipts } = await import(${JSON.stringify(receiptsModule)}); const { readReportManifests } = await import(${JSON.stringify(reportsModule)}); ${code}`,
    ],
    {
      cwd: directory,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${directory}${delimiter}${process.env.PATH}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  const calls = JSON.parse(
    await readFile(join(directory, 'calls.json'), 'utf8'),
  )
  assert.equal(calls.length, responses.length)
  return result.trim()
}

test('first draft upload uses the retained numeric ID without a by-tag lookup', async (t) => {
  await scenario(
    t,
    [
      { path: `${repo}/releases/41/assets?per_page=100&page=1`, json: [] },
      { path: upload, method: 'POST', json: { id: 51 } },
    ],
    `await uploadImmutable({ id: 41 }, 'package.zip')`,
  )
})

test('a pending draft is recovered from the authenticated inventory and equal assets are reused', async (t) => {
  const found = await scenario(
    t,
    [
      { path: `${repo}/releases/tags/v3.0.1`, error: 'HTTP 404: Not Found' },
      { path: `${repo}/releases?per_page=100&page=1`, json: [draft] },
      {
        path: `${repo}/releases/41/assets?per_page=100&page=1`,
        json: [uploaded],
      },
      { path: `${repo}/releases/assets/51`, bytes: 'frozen package bytes' },
    ],
    `const release = await optionalRelease('v3.0.1'); await uploadImmutable(release, 'package.zip'); process.stdout.write(JSON.stringify(release))`,
  )
  assert.deepEqual(JSON.parse(found), draft)
})

test('draft recovery paginates and a missing release remains absent', async (t) => {
  const page = Array.from({ length: 100 }, (_, id) => ({
    id: id + 100,
    tag_name: `other-${id}`,
  }))
  const found = await scenario(
    t,
    [
      { path: `${repo}/releases/tags/v3.0.1`, error: 'HTTP 404: Not Found' },
      { path: `${repo}/releases?per_page=100&page=1`, json: page },
      { path: `${repo}/releases?per_page=100&page=2`, json: [draft] },
      { path: `${repo}/releases/tags/v3.0.2`, error: 'HTTP 404: Not Found' },
      { path: `${repo}/releases?per_page=100&page=1`, json: [] },
    ],
    `process.stdout.write(JSON.stringify([await optionalRelease('v3.0.1'), await optionalRelease('v3.0.2')]))`,
  )
  assert.deepEqual(JSON.parse(found), [draft, null])
})

test('conflicting draft assets fail without uploading or publishing', async (t) => {
  const error = await scenario(
    t,
    [
      {
        path: `${repo}/releases/41/assets?per_page=100&page=1`,
        json: [uploaded],
      },
      { path: `${repo}/releases/assets/51`, bytes: 'different bytes' },
    ],
    `try { await uploadImmutable({ id: 41 }, 'package.zip') } catch (error) { process.stdout.write(error.message) }`,
  )
  assert.match(error, /refusing to overwrite release asset/)
})

test('release lookup does not mask authorization failures as an absent draft', async (t) => {
  const error = await scenario(
    t,
    [{ path: `${repo}/releases/tags/v3.0.1`, error: 'HTTP 403: Forbidden' }],
    `try { await optionalRelease('v3.0.1') } catch (error) { process.stdout.write(String(error.stderr)) }`,
  )
  assert.match(error, /HTTP 403/)
})

test('trusted empty starter assets are rechecked, removed and uploaded once', async (t) => {
  await scenario(
    t,
    [
      {
        path: `${repo}/releases/41/assets?per_page=100&page=1`,
        json: [starter],
      },
      { path: `${repo}/releases/assets/51`, json: starter },
      { path: `${repo}/releases/assets/51`, method: 'DELETE' },
      { path: upload, method: 'POST', json: uploaded },
    ],
    `await uploadImmutable({ id: 41 }, 'package.zip')`,
  )
})

test('another upload failure stops after one placeholder cleanup and upload request', async (t) => {
  const error = await scenario(
    t,
    [
      {
        path: `${repo}/releases/41/assets?per_page=100&page=1`,
        json: [starter],
      },
      { path: `${repo}/releases/assets/51`, json: starter },
      { path: `${repo}/releases/assets/51`, method: 'DELETE' },
      { path: upload, method: 'POST', error: 'HTTP 502: Bad Gateway' },
    ],
    `try { await uploadImmutable({ id: 41 }, 'package.zip') } catch (error) { process.stdout.write(error.message + String(error.cause?.stderr)) }`,
  )
  assert.match(error, /stopped after one attempt/)
  assert.match(error, /HTTP 502/)
})

test('an asset that completed before cleanup is preserved and compared', async (t) => {
  await scenario(
    t,
    [
      {
        path: `${repo}/releases/41/assets?per_page=100&page=1`,
        json: [starter],
      },
      { path: `${repo}/releases/assets/51`, json: uploaded },
      { path: `${repo}/releases/assets/51`, bytes: 'frozen package bytes' },
    ],
    `await uploadImmutable({ id: 41 }, 'package.zip')`,
  )
})

test('an empty completed asset is rejected rather than deleted', async (t) => {
  const error = await scenario(
    t,
    [
      {
        path: `${repo}/releases/41/assets?per_page=100&page=1`,
        json: [{ ...uploaded, size: 0 }],
      },
      { path: `${repo}/releases/assets/51`, bytes: '' },
    ],
    `try { await uploadImmutable({ id: 41 }, 'package.zip') } catch (error) { process.stdout.write(error.message) }`,
  )
  assert.match(error, /refusing to overwrite release asset/)
})

for (const [name, asset] of [
  [
    'untrusted placeholder',
    { ...starter, uploader: { login: 'someone-else' } },
  ],
  ['nonempty starter', { ...starter, size: 7 }],
  ['unknown state', { ...starter, state: 'unknown' }],
]) {
  test(`${name} is never removed or overwritten`, async (t) => {
    const error = await scenario(
      t,
      [
        {
          path: `${repo}/releases/41/assets?per_page=100&page=1`,
          json: [asset],
        },
      ],
      `try { await uploadImmutable({ id: 41 }, 'package.zip') } catch (error) { process.stdout.write(error.message) }`,
    )
    assert.match(error, /refusing to remove|unsupported release asset state/)
  })
}

test('a placeholder that changes ownership during recheck is not removed', async (t) => {
  const error = await scenario(
    t,
    [
      {
        path: `${repo}/releases/41/assets?per_page=100&page=1`,
        json: [starter],
      },
      {
        path: `${repo}/releases/assets/51`,
        json: { ...starter, uploader: { login: 'someone-else' } },
      },
    ],
    `try { await uploadImmutable({ id: 41 }, 'package.zip') } catch (error) { process.stdout.write(error.message) }`,
  )
  assert.match(error, /refusing to remove/)
})

test('a failed placeholder deletion stops before any upload', async (t) => {
  const error = await scenario(
    t,
    [
      {
        path: `${repo}/releases/41/assets?per_page=100&page=1`,
        json: [starter],
      },
      { path: `${repo}/releases/assets/51`, json: starter },
      {
        path: `${repo}/releases/assets/51`,
        method: 'DELETE',
        error: 'HTTP 403: Forbidden',
      },
    ],
    `try { await uploadImmutable({ id: 41 }, 'package.zip') } catch (error) { process.stdout.write(String(error.stderr)) }`,
  )
  assert.match(error, /HTTP 403/)
})

const publication = { commit: 'a'.repeat(40), candidateSha256: 'b'.repeat(64) }
const receiptAsset = { ...uploaded, name: 'publication.json' }

test('incomplete publication receipts are removed before parsing and regenerated', async (t) => {
  const placeholder = { ...starter, name: 'publication.json' }
  const value = await scenario(
    t,
    [
      {
        path: `${repo}/releases/41/assets?per_page=100&page=1`,
        json: [placeholder],
      },
      { path: `${repo}/releases/assets/51`, json: placeholder },
      { path: `${repo}/releases/assets/51`, method: 'DELETE' },
    ],
    `process.stdout.write(await publicationReceipt({ id: 41 }, ${JSON.stringify(publication)}))`,
  )
  assert.deepEqual(JSON.parse(value), publication)
})

test('a completed publication receipt retains its original bytes', async (t) => {
  const bytes = JSON.stringify({
    ...publication,
    recordedAt: '2026-10-20T00:00:00Z',
  })
  const value = await scenario(
    t,
    [
      {
        path: `${repo}/releases/41/assets?per_page=100&page=1`,
        json: [receiptAsset],
      },
      { path: `${repo}/releases/assets/51`, bytes },
    ],
    `process.stdout.write(await publicationReceipt({ id: 41 }, ${JSON.stringify(publication)}))`,
  )
  assert.equal(value, bytes)
})

test('completed conflicting publication receipts remain immutable', async (t) => {
  const error = await scenario(
    t,
    [
      {
        path: `${repo}/releases/41/assets?per_page=100&page=1`,
        json: [receiptAsset],
      },
      {
        path: `${repo}/releases/assets/51`,
        bytes: JSON.stringify({
          ...publication,
          candidateSha256: 'c'.repeat(64),
        }),
      },
    ],
    `try { await publicationReceipt({ id: 41 }, ${JSON.stringify(publication)}) } catch (error) { process.stdout.write(error.message) }`,
  )
  assert.match(error, /draft publication receipt conflicts/)
})

const candidate = {
  source: { commit: 'a'.repeat(40), tag: 'v3.0.1', version: '3.0.1' },
  files: [{ name: 'build_chrome.zip', sha256: 'b'.repeat(64) }],
}
const receipt = {
  schemaVersion: 1,
  store: 'edge',
  tag: candidate.source.tag,
  commit: candidate.source.commit,
  packageSha256: candidate.files[0].sha256,
  candidateSha256: 'c'.repeat(64),
  runId: '600',
  attempt: 1,
  recordedAt: '2026-10-20T12:00:00Z',
  phase: 'submitted',
  details: {
    acceptance: {
      schemaVersion: 1,
      store: 'edge',
      version: candidate.source.version,
      packageSha256: candidate.files[0].sha256,
      upload: { id: 'upload-1', status: 'Succeeded' },
      submission: { id: 'publish-1', status: 'Succeeded' },
    },
  },
}
const incompleteReceipt = {
  ...starter,
  name: 'store-edge-500-1-001.json',
  created_at: '2026-10-20T11:00:00Z',
}
const readReceipts = (assets) =>
  `await readStoreReceipts(${JSON.stringify(assets)}, 'edge', ${JSON.stringify(candidate)}, ${JSON.stringify(receipt.candidateSha256)})`

test('an empty old store checkpoint is unknown, requires reconciliation, and permits an explicit retry', async (t) => {
  const result = await scenario(
    t,
    [],
    `
    const entries = ${readReceipts([incompleteReceipt])};
    let blocked;
    try { storeRetryDecision(entries, false) } catch (error) { blocked = error.message }
    process.stdout.write(JSON.stringify({
      blocked,
      retry: storeRetryDecision(entries, true),
      summary: summarizeStoreReceipts('edge', entries),
      bytes: entries[0].bytes,
      firstAttempt: storeRetryDecision([], false),
    }));
  `,
  )
  const value = JSON.parse(result)
  assert.match(value.blocked, /requires store reconciliation/)
  assert.equal(value.retry, 'submit')
  assert.equal(value.firstAttempt, 'submit')
  assert.equal(value.bytes, null)
  assert.deepEqual(value.summary, {
    store: 'edge',
    state: 'unknown',
    runId: '500',
    recordedAt: incompleteReceipt.created_at,
  })
})

test('a validated later store submission survives an older incomplete checkpoint and preserves original bytes', async (t) => {
  const bytes = JSON.stringify(receipt) + '\n\n'
  const saved = {
    ...uploaded,
    id: 52,
    name: 'store-edge-600-1-902.json',
    size: Buffer.byteLength(bytes),
  }
  const result = await scenario(
    t,
    [{ path: `${repo}/releases/assets/52`, bytes }],
    `
    const entries = ${readReceipts([saved, incompleteReceipt])};
    process.stdout.write(JSON.stringify({
      decision: storeRetryDecision(entries, false),
      summary: summarizeStoreReceipts('edge', entries),
      bytes: entries[0].bytes.toString(),
    }));
  `,
  )
  const value = JSON.parse(result)
  assert.equal(value.decision, 'skip')
  assert.equal(value.summary.state, 'submitted')
  assert.equal(value.summary.runId, '600')
  assert.equal(value.bytes, bytes)
})

test('an older submitted receipt without acceptance proof remains unknown without changing its archived bytes', async (t) => {
  const unverified = { ...receipt, details: undefined }
  const bytes = JSON.stringify(unverified) + '\n'
  const saved = {
    ...uploaded,
    id: 52,
    name: 'store-edge-600-1-902.json',
    size: Buffer.byteLength(bytes),
  }
  const result = await scenario(
    t,
    [{ path: `${repo}/releases/assets/52`, bytes }],
    `
    const entries = ${readReceipts([saved])};
    let blocked;
    try { storeRetryDecision(entries, false) } catch (error) { blocked = error.message }
    process.stdout.write(JSON.stringify({blocked, retry: storeRetryDecision(entries, true), summary: summarizeStoreReceipts('edge', entries), bytes: entries[0].bytes.toString()}));
  `,
  )
  const value = JSON.parse(result)
  assert.match(value.blocked, /requires store reconciliation/)
  assert.equal(value.retry, 'submit')
  assert.equal(value.summary.state, 'unknown')
  assert.equal(value.bytes, bytes)
})

for (const [name, mutate] of [
  [
    'wrong package',
    (value) => {
      value.packageSha256 = 'd'.repeat(64)
    },
  ],
  [
    'wrong candidate',
    (value) => {
      value.candidateSha256 = 'd'.repeat(64)
    },
  ],
  [
    'wrong filename run',
    (value) => {
      value.runId = '700'
    },
  ],
]) {
  test(`completed store receipts with ${name} are errors even for reconciled retries`, async (t) => {
    const value = { ...receipt }
    mutate(value)
    const bytes = JSON.stringify(value)
    const saved = {
      ...uploaded,
      name: 'store-edge-600-1-902.json',
      size: Buffer.byteLength(bytes),
    }
    const error = await scenario(
      t,
      [{ path: `${repo}/releases/assets/51`, bytes }],
      `
      try { storeRetryDecision(${readReceipts([saved])}, true) }
      catch (error) { process.stdout.write(error.message) }
    `,
    )
    assert.match(error, /different packages or has invalid identity/)
  })
}

const report = {
  schemaVersion: 1,
  kind: 'release-report',
  id: 'release-report-600-1',
  recordedAt: receipt.recordedAt,
  source: { ...candidate.source, version: '3.0.1' },
  publisher: {
    repository: 'xcv58/Tab-Manager-v2',
    workflow: 'publish-release.yml',
    commit: candidate.source.commit,
    runId: '600',
    attempt: 1,
  },
  files: ['checks', 'publisher'].map((kind) => ({
    kind,
    name: `${kind}.json`,
    bytes: 2,
    sha256: 'd'.repeat(64),
  })),
}

test('report discovery skips an old empty manifest and keeps the later complete capture', async (t) => {
  const bytes = JSON.stringify(report)
  const saved = {
    ...uploaded,
    id: 52,
    name: `${report.id}.manifest.json`,
    size: Buffer.byteLength(bytes),
  }
  const result = await scenario(
    t,
    [{ path: `${repo}/releases/assets/52`, bytes }],
    `
    const reports = await readReportManifests(${JSON.stringify([
      { ...starter, name: 'release-report-500-1.manifest.json' },
      saved,
    ])});
    process.stdout.write(JSON.stringify(reports.map(({ report }) => report.id)));
  `,
  )
  assert.deepEqual(JSON.parse(result), [report.id])
})

for (const [name, asset] of [
  [
    'untrusted placeholder',
    { ...starter, uploader: { login: 'someone-else' } },
  ],
  ['nonempty placeholder', { ...starter, size: 2 }],
  ['empty completed upload', { ...uploaded, size: 0 }],
  ['unsupported state', { ...uploaded, state: 'unknown' }],
]) {
  test(`JSON readers reject ${name} without downloading or deleting it`, async (t) => {
    const error = await scenario(
      t,
      [],
      `
      try { await readJsonAsset(${JSON.stringify(asset)}) }
      catch (error) { process.stdout.write(error.message) }
    `,
    )
    assert.match(
      error,
      /untrusted|nonempty incomplete|empty or oversized|unsupported/,
    )
  })
}

for (const [name, bytes] of [
  ['malformed completed JSON', '{'],
  ['invalid completed schema', '{}'],
]) {
  test(`report discovery does not silently skip ${name}`, async (t) => {
    const saved = {
      ...uploaded,
      name: `${report.id}.manifest.json`,
      size: Buffer.byteLength(bytes),
    }
    const result = await scenario(
      t,
      [{ path: `${repo}/releases/assets/51`, bytes }],
      `
      let rejected = false;
      try { await readReportManifests([${JSON.stringify(saved)}]) }
      catch { rejected = true }
      process.stdout.write(String(rejected));
    `,
    )
    assert.equal(result, 'true')
  })
}

for (const [name, assets] of [
  ['no source artifact', []],
  [
    'an expired source artifact',
    [{ name: 'performance-source-123-2', expired: true }],
  ],
  [
    'only an earlier attempt',
    [{ name: 'performance-source-123-1', expired: false }],
  ],
  [
    'only unrelated diagnostics',
    [{ name: 'performance-diagnostics-123-2', expired: false }],
  ],
]) {
  test(`late benchmark checks remain unavailable with ${name}`, async (t) => {
    const result = await scenario(
      t,
      [
        {
          path: `${repo}/actions/runs/123/artifacts?per_page=100&page=1`,
          json: assets,
        },
      ],
      `
      const { loadBenchmarkSource } = await import(${JSON.stringify(metricModule)});
      const source = await loadBenchmarkSource({ id: 123, run_attempt: 2 }, 'a'.repeat(40), '.');
      process.stdout.write(String(source === null));
    `,
    )
    assert.equal(result, 'true')
  })
}
