import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assertReleaseTag,
  assertReleaseVersion,
  compareVersions,
  readReleaseVersion,
} from './release-policy.mjs'

for (const version of ['0.0.0', '2.7.2', '3.0.0']) {
  test(`publishing rejects ${version}`, () => {
    assert.throws(() => assertReleaseVersion(version), /newer than 3\.0\.0/)
    assert.throws(() => assertReleaseTag(`v${version}`), /newer than 3\.0\.0/)
  })
}
for (const version of ['3.0.1', '3.1.0', '3.10.0', '4.0.0', '10.0.0']) {
  test(`publishing permits ${version}`, () => {
    assert.equal(assertReleaseVersion(version), version)
    assert.equal(assertReleaseTag(`v${version}`, version), version)
  })
}
for (const value of [
  '',
  '3.0',
  'v3.0.1',
  '03.0.1',
  '3.0.1-beta.1',
  '3.0.1+build.2',
  '3.0.1\nextra',
  '3.0.1\n',
]) {
  test(`rejects malformed or nonstable version ${JSON.stringify(value)}`, () => {
    assert.throws(() => assertReleaseVersion(value), /stable MAJOR/)
  })
}
test('compares numeric components and rejects a mismatched release output', () => {
  assert.equal(compareVersions('3.10.0', '3.9.9'), 1)
  assert.throws(() => assertReleaseTag('v3.0.1', '3.0.2'), /disagree/)
  assert.throws(() => assertReleaseTag('3.0.1'), /disagree/)
})
test('all browser and native marketing versions must match', (t) => {
  const cwd = mkdtempSync(join(tmpdir(), 'tmv2-release-metadata-'))
  t.after(() => rmSync(cwd, { recursive: true, force: true }))
  for (const path of [
    'packages/extension',
    'packages/safari-native/WebExtension',
  ])
    mkdirSync(join(cwd, path), { recursive: true })
  const json = (path, data) =>
    writeFileSync(join(cwd, path), JSON.stringify(data))
  json('packages/extension/package.json', { version: '3.0.1' })
  json('packages/safari-native/WebExtension/manifest.json', {
    version: '3.0.1',
  })
  writeFileSync(
    join(cwd, 'packages/safari-native/project.yml'),
    "settings:\n  base:\n    MARKETING_VERSION: '3.0.1'\n",
  )
  assert.equal(readReleaseVersion(cwd), '3.0.1')
  json('packages/safari-native/WebExtension/manifest.json', {
    version: '3.0.0',
  })
  assert.throws(() => readReleaseVersion(cwd), /safari version/)
})
