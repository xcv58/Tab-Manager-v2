import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { URL } from 'node:url'

const githubModule = new URL('./github.mjs', import.meta.url).href
const publishModule = new URL('./publish.mjs', import.meta.url).href
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
      `const { optionalRelease, uploadImmutable, completedAsset } = await import(${JSON.stringify(githubModule)}); const { publicationReceipt } = await import(${JSON.stringify(publishModule)}); ${code}`,
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
