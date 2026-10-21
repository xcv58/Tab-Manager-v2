import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assertReleaseRemote,
  assertReleaseTag,
  pushReleaseTag,
  remoteTagCommit,
} from './tag.mjs'
import { assertNewReleaseVersion, releaseStores } from './publish.mjs'

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'release-tag-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const remote = join(root, 'origin.git'),
    checkout = join(root, 'checkout')
  const run = (args, cwd = checkout) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  await mkdir(checkout)
  run(['init', '--bare', remote], root)
  run(['init', '-b', 'master'])
  for (const [key, value] of [
    ['user.name', 'Release fixture'],
    ['user.email', 'release@example.invalid'],
    ['commit.gpgsign', 'false'],
    ['tag.gpgsign', 'false'],
  ])
    run(['config', key, value])
  await mkdir(join(checkout, '.github', 'workflows'), { recursive: true })
  await writeFile(
    join(checkout, '.github', 'workflows', 'release.yml'),
    'name: original\n',
  )
  run(['add', '.'])
  run(['commit', '-m', 'reviewed source'])
  const commit = run(['rev-parse', 'HEAD'])
  await writeFile(
    join(checkout, '.github', 'workflows', 'release.yml'),
    'name: newer workflow\n',
  )
  run(['commit', '-am', 'advance master'])
  const master = run(['rev-parse', 'HEAD'])
  run(['remote', 'add', 'origin', remote])
  run(['push', 'origin', 'master'])
  return {
    checkout,
    remote,
    run,
    commit,
    master,
    source: { tag: 'v3.0.1', commit },
  }
}

test('the approved tag identifies an older frozen source after master workflow edits and retries reuse it', async (t) => {
  const { source, master, checkout } = await fixture(t)
  assert.notEqual(source.commit, master)
  assert.equal(remoteTagCommit(source.tag, checkout), null)
  assert.throws(
    () => assertReleaseTag(source, checkout),
    /tag is missing or differs/,
  )
  assert.equal(pushReleaseTag(source, checkout), true)
  assert.equal(remoteTagCommit(source.tag, checkout), source.commit)
  assert.doesNotThrow(() => assertReleaseTag(source, checkout))
  assert.equal(pushReleaseTag(source, checkout), false)
})

test('conflicting remote tags are rejected without being moved', async (t) => {
  const { source, master, checkout, run } = await fixture(t)
  run(['push', 'origin', `${master}:refs/tags/${source.tag}`])
  assert.throws(
    () => pushReleaseTag(source, checkout),
    /already points to a different commit/,
  )
  assert.throws(
    () => assertReleaseTag(source, checkout),
    /tag is missing or differs/,
  )
  assert.equal(remoteTagCommit(source.tag, checkout), master)
})

test('matching annotated tags are resolved to their source commit and preserved', async (t) => {
  const { source, checkout, run } = await fixture(t)
  run(['tag', '-a', source.tag, source.commit, '-m', 'reviewed release'])
  run(['push', 'origin', `refs/tags/${source.tag}`])
  assert.equal(remoteTagCommit(source.tag, checkout), source.commit)
  assert.equal(pushReleaseTag(source, checkout), false)
})

test('the approved push excludes other annotated tags even when automatic following is enabled', async (t) => {
  const { source, checkout, run } = await fixture(t)
  run(['tag', '-a', 'v3.0.0', source.commit, '-m', 'withdrawn local release'])
  run(['config', 'push.followTags', 'true'])
  assert.equal(pushReleaseTag(source, checkout), true)
  assert.equal(remoteTagCommit(source.tag, checkout), source.commit)
  assert.equal(remoteTagCommit('v3.0.0', checkout), null)
})

test('a source unavailable from origin fails without creating a tag', async (t) => {
  const { source, checkout } = await fixture(t)
  assert.throws(() =>
    pushReleaseTag({ ...source, commit: 'f'.repeat(40) }, checkout),
  )
  assert.equal(remoteTagCommit(source.tag, checkout), null)
})

test('publication accepts only the configured release repository before pushing', async (t) => {
  const { checkout, run } = await fixture(t)
  assert.throws(
    () => assertReleaseRemote(checkout),
    /origin must point to the release repository/,
  )
  for (const url of [
    'git@github.com:xcv58/Tab-Manager-v2.git',
    'https://github.com/xcv58/Tab-Manager-v2.git',
    'ssh://git@github.com/xcv58/Tab-Manager-v2.git',
  ]) {
    run(['remote', 'set-url', 'origin', url])
    assert.doesNotThrow(() => assertReleaseRemote(checkout))
  }
  run(['remote', 'set-url', 'origin', 'git@github.com:someone/else.git'])
  assert.throws(
    () => assertReleaseRemote(checkout),
    /origin must point to the release repository/,
  )
})

test('preflight validates every push URL and rejects ambiguous destinations', async (t) => {
  const { checkout, remote, source, run } = await fixture(t)
  const fetchUrl = 'https://github.com/xcv58/Tab-Manager-v2.git'
  const pushUrl = 'git@github.com:xcv58/Tab-Manager-v2.git'
  run(['remote', 'set-url', 'origin', fetchUrl])
  run(['remote', 'set-url', '--push', 'origin', pushUrl])
  assert.doesNotThrow(() => assertReleaseRemote(checkout))
  run(['remote', 'set-url', '--push', '--add', 'origin', fetchUrl])
  assert.throws(
    () => assertReleaseRemote(checkout),
    /exactly one release push destination/,
  )
  run([
    'remote',
    'set-url',
    '--push',
    '--add',
    'origin',
    'git@github.com:someone/fork.git',
  ])
  assert.throws(() => assertReleaseRemote(checkout), /every push destination/)
  run(['remote', 'set-url', '--push', '--delete', 'origin', '.*'])
  run([
    'remote',
    'set-url',
    '--push',
    'origin',
    'git@github.com:someone/fork.git',
  ])
  assert.throws(() => assertReleaseRemote(checkout), /every push destination/)
  assert.equal(
    run(['ls-remote', '--tags', remote, `refs/tags/${source.tag}`]),
    '',
  )
})

test('push-only URL rewrites are validated before publication', async (t) => {
  const { checkout, run } = await fixture(t)
  const url = 'git@github.com:xcv58/Tab-Manager-v2.git'
  run(['remote', 'set-url', 'origin', url])
  run([
    'config',
    'url.git@github.com:someone/.pushInsteadOf',
    'git@github.com:xcv58/',
  ])
  assert.throws(() => assertReleaseRemote(checkout), /every push destination/)
})

test('local preflight rejects invalid store selections and stale stable versions', () => {
  for (const value of ['chrome,none', 'edge,edge', 'unknown'])
    assert.throws(() => releaseStores(value), /invalid store selection/)
  assert.deepEqual(releaseStores('chrome,firefox,edge'), [
    'chrome',
    'firefox',
    'edge',
  ])
  const candidate = { source: { version: '3.0.1' } }
  assert.doesNotThrow(() =>
    assertNewReleaseVersion(candidate, [{ tag_name: 'v2.7.2' }]),
  )
  for (const tag_name of ['v3.0.1', 'v3.0.2'])
    assert.throws(
      () => assertNewReleaseVersion(candidate, [{ tag_name }]),
      /must exceed existing stable versions/,
    )
})
