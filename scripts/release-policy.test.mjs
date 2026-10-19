import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { URL } from 'node:url'
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
  json('.release-please-manifest.json', { 'packages/extension': '3.0.1' })
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
test('release automation checks the floor before creation and all store submissions', () => {
  const read = (path) =>
    readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
  const workflow = read('.github/workflows/release-please.yml')
  assert.ok(
    workflow.indexOf('id: eligibility') < workflow.indexOf('id: release\n'),
  )
  assert.match(
    workflow,
    /skip-github-release: \$\{\{ steps\.eligibility\.outputs\.allow_release != 'true' \}\}/,
  )
  assert.match(
    workflow,
    /extension_release_created: \$\{\{ steps\.release\.outputs\['packages\/extension--release_created'\] == 'true' && steps\.version-guard\.outputs\.allow_release == 'true' \}\}/,
  )
  assert.match(
    workflow,
    /node scripts\/release-policy\.mjs tag "\$RELEASE_TAG" "\$RELEASE_VERSION"/,
  )
  for (const job of [
    'build-release',
    'attach-release-assets',
    'publish-chrome',
    'publish-firefox',
    'publish-edge',
  ]) {
    const section = workflow
      .slice(workflow.indexOf(`\n  ${job}:`) + 1)
      .split(/\n {2}[a-z-]+:/)[0]
    assert.match(
      section,
      /needs\.release-please\.outputs\.extension_release_created == 'true'/,
    )
  }
  const retry = read('.github/workflows/retry-edge-release.yml')
  assert.ok(
    retry.indexOf('node scripts/release-policy.mjs tag') <
      retry.indexOf('gh release view'),
  )
  assert.match(
    read('.github/workflows/nodejs.yml'),
    /release-policy\.mjs candidate/,
  )
  assert.match(
    read('release-please-config.json'),
    /"bootstrap-sha": "c2dea3aacb3c1fb871434bdcbbcf54019b03f602"/,
  )
})
