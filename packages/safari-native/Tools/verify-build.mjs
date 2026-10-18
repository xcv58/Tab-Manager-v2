import assert from 'node:assert/strict'
import console from 'node:console'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const configuration = process.env.SAFARI_BUILD_CONFIGURATION || 'Debug'
assert(
  ['Debug', 'Release'].includes(configuration),
  'Unknown Safari configuration',
)
const settings = readFileSync(
  `packages/safari-native/Config/${configuration}.xcconfig`,
  'utf8',
)
const setting = (name) => {
  const value = settings.match(new RegExp(`^${name} = (.+)$`, 'm'))?.[1]
  assert(value, `Missing ${name}`)
  return value
}
const app = resolve(
  process.env.SAFARI_VERIFY_APP ||
    `.tmp/safari-ci/Build/Products/${configuration}/TabManagerSafariPrototype.app`,
)
const extension = join(app, 'Contents/PlugIns/SafariBridge.appex')
const plist = (bundle) =>
  JSON.parse(
    execFileSync(
      'plutil',
      ['-convert', 'json', '-o', '-', join(bundle, 'Contents/Info.plist')],
      { encoding: 'utf8' },
    ),
  )
const hostInfo = plist(app)
const extensionInfo = plist(extension)
assert.equal(
  hostInfo.CFBundleIdentifier,
  setting('TM_SAFARI_APP_BUNDLE_IDENTIFIER'),
)
assert.equal(
  extensionInfo.CFBundleIdentifier,
  setting('TM_SAFARI_EXTENSION_BUNDLE_IDENTIFIER'),
)
assert.equal(
  hostInfo.SafariExtensionIdentifier,
  extensionInfo.CFBundleIdentifier,
)
assert.equal(
  hostInfo.SafariAppGroupIdentifier,
  setting('TM_SAFARI_APP_GROUP_IDENTIFIER'),
)
assert.equal(
  extensionInfo.SafariAppGroupIdentifier,
  hostInfo.SafariAppGroupIdentifier,
)
assert.equal(
  hostInfo.CFBundleURLTypes[0].CFBundleURLSchemes[0],
  setting('TM_SAFARI_URL_SCHEME'),
)
assert.equal(hostInfo.CFBundleVersion, extensionInfo.CFBundleVersion)
assert.equal(
  hostInfo.CFBundleShortVersionString,
  extensionInfo.CFBundleShortVersionString,
)
const source = resolve('packages/extension/build/build_safari')
const resources = join(extension, 'Contents/Resources')
for (const name of readdirSync(source)) {
  assert.deepEqual(
    readFileSync(join(resources, name)),
    readFileSync(join(source, name)),
    `Packaged asset differs: ${name}`,
  )
}
const manifest = JSON.parse(
  readFileSync(join(resources, 'manifest.json'), 'utf8'),
)
assert.equal(manifest.version, hostInfo.CFBundleShortVersionString)
assert.deepEqual(manifest.permissions, ['tabs', 'storage'])
console.log(
  `Verified Safari ${configuration}: app/extension identity, versions, and all ${readdirSync(source).length} web resources. This unsigned build is not a distributable package.`,
)
