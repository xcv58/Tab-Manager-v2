import console from 'node:console'
import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const RELEASE_FLOOR = '3.0.0'

export function compareVersions(left, right) {
  const parse = (value) => {
    if (
      typeof value !== 'string' ||
      value.trim() !== value ||
      !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)
    )
      throw new Error(`Expected a stable MAJOR.MINOR.PATCH version: ${value}`)
    return value.split('.').map(BigInt)
  }
  const a = parse(left)
  const b = parse(right)
  for (let index = 0; index < a.length; index++) {
    if (a[index] > b[index]) return 1
    if (a[index] < b[index]) return -1
  }
  return 0
}

export function assertReleaseVersion(version) {
  if (compareVersions(version, RELEASE_FLOOR) <= 0)
    throw new Error(
      `Automated releases must be newer than ${RELEASE_FLOOR}: ${version}`,
    )
  return version
}

export function assertReleaseTag(tag, version = tag?.slice(1)) {
  if (!tag?.startsWith('v') || tag !== `v${version}`)
    throw new Error(`Release tag and version disagree: ${tag}, ${version}`)
  return assertReleaseVersion(version)
}

export function readReleaseVersion(cwd = process.cwd()) {
  const read = (path) => readFileSync(resolve(cwd, path), 'utf8')
  const product = JSON.parse(read('packages/extension/package.json')).version
  const manifest = JSON.parse(read('.release-please-manifest.json'))[
    'packages/extension'
  ]
  const safari = JSON.parse(
    read('packages/safari-native/WebExtension/manifest.json'),
  ).version
  const native = read('packages/safari-native/project.yml').match(
    /^\s+MARKETING_VERSION:\s*(['"]?)([^'"\s]+)\1\s*$/m,
  )?.[2]
  compareVersions(product, RELEASE_FLOOR)
  for (const [name, version] of Object.entries({ manifest, safari, native })) {
    if (version !== product)
      throw new Error(
        `${name} version ${version} does not match extension ${product}`,
      )
  }
  return product
}

export function main(args, env = process.env) {
  const [command, ...values] = args
  let version
  if (command === 'eligibility' && values.length === 0) {
    version = readReleaseVersion()
    const allowed = compareVersions(version, RELEASE_FLOOR) > 0
    if (env.GITHUB_OUTPUT)
      appendFileSync(
        env.GITHUB_OUTPUT,
        `allow_release=${allowed}\nversion=${version}\n`,
      )
    console.log(
      `Version ${version}: automated release ${allowed ? 'allowed' : 'blocked'} (must be > ${RELEASE_FLOOR}).`,
    )
    return
  }
  if (command === 'candidate' && values.length === 0) {
    version = assertReleaseVersion(readReleaseVersion())
  } else if (
    command === 'tag' &&
    (values.length === 1 || values.length === 2)
  ) {
    version = assertReleaseTag(...values)
  } else {
    throw new Error(
      'Usage: node scripts/release-policy.mjs eligibility | candidate | tag vMAJOR.MINOR.PATCH [VERSION]',
    )
  }
  console.log(`Release version ${version} is newer than ${RELEASE_FLOOR}.`)
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
