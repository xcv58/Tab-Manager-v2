import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { URL } from 'node:url'

const githubModule = new URL('./github.mjs', import.meta.url).href
const repo = 'repos/xcv58/Tab-Manager-v2'
const upload =
  'https://uploads.github.com/repos/xcv58/Tab-Manager-v2/releases/41/assets?name=package.zip'
const draft = { id: 41, tag_name: 'v3.0.1', draft: true }

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
process.stdout.write(response.bytes === undefined ? JSON.stringify(response.json) : response.bytes)
`,
    { mode: 0o755 },
  )
  const result = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `const { optionalRelease, uploadImmutable } = await import(${JSON.stringify(githubModule)}); ${code}`,
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
        json: [{ id: 51, name: 'package.zip' }],
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
        json: [{ id: 51, name: 'package.zip' }],
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
