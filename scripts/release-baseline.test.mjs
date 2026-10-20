import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveReleaseBaseline } from './release-baseline.mjs'

function repository(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'tmv2-release-baseline-'))
  t.after(() => rmSync(cwd, { recursive: true, force: true }))
  const git = (...args) =>
    execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  git('init', '--quiet')
  git('config', 'user.name', 'Release regression')
  git('config', 'user.email', 'release-test@example.invalid')
  const commit = (message) => {
    git('add', '.')
    git('commit', '--quiet', '--allow-empty', '-m', message)
    return git('rev-parse', 'HEAD')
  }
  const configure = (value) => {
    writeFileSync(join(cwd, 'release-config.json'), JSON.stringify(value))
    commit('chore: configure release baseline')
  }
  return { cwd, git, commit, configure }
}

test('a manual release after an older tag bounds the audit', (t) => {
  const repo = repository(t)
  repo.commit('old release')
  repo.git('tag', 'v2.7.2')
  const manual = repo.commit('manual 3.0.0 source')
  repo.configure({ 'bootstrap-sha': manual })
  repo.commit('fix: new search behavior')
  assert.equal(resolveReleaseBaseline('HEAD', repo.cwd), manual)
})

test('a later release tag takes over from the manual fallback', (t) => {
  const repo = repository(t)
  const manual = repo.commit('manual 3.0.0 source')
  repo.configure({ 'bootstrap-sha': manual })
  repo.commit('chore(master): release 3.0.1')
  repo.git('tag', 'v3.0.1')
  repo.commit('fix: next release')
  assert.equal(resolveReleaseBaseline('HEAD', repo.cwd), 'v3.0.1')
})

test('a missing tag does not require recreating or publishing one', (t) => {
  const repo = repository(t)
  const manual = repo.commit('manual source')
  repo.configure({ 'bootstrap-sha': manual })
  assert.equal(resolveReleaseBaseline('HEAD', repo.cwd), manual)
})

test('an invalid or unrelated baseline fails rather than choosing stale history', (t) => {
  const repo = repository(t)
  repo.commit('initial')
  repo.configure({ 'bootstrap-sha': 'not-a-sha' })
  assert.throws(
    () => resolveReleaseBaseline('HEAD', repo.cwd),
    /full commit SHA/,
  )
  const beforeManual = repo.git('rev-parse', 'HEAD')
  const future = repo.commit('future source')
  repo.git('checkout', '--quiet', '--detach', beforeManual)
  repo.configure({ 'bootstrap-sha': future })
  assert.throws(
    () => resolveReleaseBaseline('HEAD', repo.cwd),
    /not an ancestor/,
  )
})

test('ordinary tagged repositories keep their existing audit boundary', (t) => {
  const repo = repository(t)
  repo.commit('release')
  repo.git('tag', 'v2.7.2')
  repo.commit('fix: next release')
  assert.equal(resolveReleaseBaseline('HEAD', repo.cwd), 'v2.7.2')
})
