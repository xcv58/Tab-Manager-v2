import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const PROMO_CLIP_IDS = [
  '01-find-tab-fast',
  '03-clean-up-duplicates',
  '02-organize-groups',
  '04-see-large-workspaces-clearly',
  '05-keyboard-workflow',
  '06-customize-the-view',
]
export const SCALE_CLIP_ID = '08-thousand-twenty-four-tabs-scale'
const isHash = (value) => /^[a-f0-9]{64}$/.test(value || '')
export const hashFile = (path) =>
  createHash('sha256').update(readFileSync(path)).digest('hex')

// Include filenames and every packaged byte, including the candidate manifest.
export function extensionBuild(directory) {
  function files(relative = '') {
    return readdirSync(join(directory, relative), { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))
      .flatMap((entry) => {
        const path = relative ? `${relative}/${entry.name}` : entry.name
        if (entry.isDirectory()) return files(path)
        if (!entry.isFile()) throw new Error(`Unsupported build entry: ${path}`)
        return [[path, hashFile(join(directory, path))]]
      })
  }
  return {
    extensionVersion: JSON.parse(
      readFileSync(join(directory, 'manifest.json'), 'utf8'),
    ).version,
    buildSha256: createHash('sha256')
      .update(JSON.stringify(files()))
      .digest('hex'),
  }
}

function sameBuild(a, b) {
  return (
    isHash(a?.buildSha256) &&
    /^\d+\.\d+\.\d+$/.test(a?.extensionVersion || '') &&
    a.buildSha256 === b?.buildSha256 &&
    a.extensionVersion === b?.extensionVersion
  )
}

export function reusableRecordings(previous, current, videoDirectory) {
  if (
    previous?.catalogueSha256 !== current.catalogueSha256 ||
    !sameBuild(previous, current)
  )
    return []
  return (previous.recordings || []).filter((entry) => {
    if (
      !sameBuild(entry, current) ||
      entry.catalogueSha256 !== current.catalogueSha256
    )
      return false
    try {
      return entry.sha256 === hashFile(join(videoDirectory, `${entry.id}.mp4`))
    } catch {
      return false
    }
  })
}

function exactSet(actual, expected, label) {
  if (
    actual.length !== expected.length ||
    new Set(actual).size !== actual.length ||
    actual.some((value) => !expected.includes(value))
  )
    throw new Error(`${label} do not match the complete required set`)
}

export function validateFeatures(
  manifest,
  catalogueSha256,
  videoDirectory,
  ids,
) {
  if (
    manifest?.catalogueSha256 !== catalogueSha256 ||
    !sameBuild(manifest, manifest)
  )
    throw new Error(
      'Recapture feature clips with one current candidate build and fixture catalogue',
    )
  const entries = manifest.recordings || []
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length)
    throw new Error('Duplicate feature clip IDs')
  return ids.map((id) => {
    const entry = entries.find((entry) => entry.id === id)
    if (
      !sameBuild(entry, manifest) ||
      entry.catalogueSha256 !== catalogueSha256 ||
      entry.sha256 !== hashFile(join(videoDirectory, `${id}.mp4`))
    )
      throw new Error(`Stale, mixed-build or missing feature clip: ${id}`)
    return entry
  })
}

export function validatePromo(
  proof,
  manifest,
  catalogueSha256,
  videoDirectory,
  path,
) {
  const current = validateFeatures(
    manifest,
    catalogueSha256,
    videoDirectory,
    PROMO_CLIP_IDS,
  )
  if (
    proof?.catalogueSha256 !== catalogueSha256 ||
    !sameBuild(proof, manifest) ||
    proof.sha256 !== hashFile(path)
  )
    throw new Error(
      'Rebuild the feature promo from the current candidate clips',
    )
  const inputs = proof.inputClips || []
  exactSet(
    inputs.map((entry) => entry.id),
    PROMO_CLIP_IDS,
    'Promo input clips',
  )
  for (const entry of current) {
    const input = inputs.find((input) => input.id === entry.id)
    if (
      !sameBuild(input, entry) ||
      input.catalogueSha256 !== catalogueSha256 ||
      input.sha256 !== entry.sha256
    )
      throw new Error(`Rebuild the stale promo after recapturing ${entry.id}`)
  }
}

export const integrationTestFiles = (directory) =>
  readdirSync(directory)
    .filter((file) => !file.startsWith('.') && file.endsWith('.test.ts'))
    .sort()

export function suitePaths(root, partial) {
  const name = `integration-test-suite${partial ? '-partial' : ''}`
  return {
    directory: join(root, '.tmp/video-captures', name),
    video: join(root, '.tmp/video-captures/mp4', `tab-manager-v2-${name}.mp4`),
  }
}

export function validateSuiteRecordings(recordings, testDirectory, files) {
  exactSet(
    (recordings || []).map((entry) => entry.file),
    files,
    'Recorded test files',
  )
  const allClips = []
  for (const entry of recordings) {
    if (
      entry.passed !== true ||
      entry.testSha256 !== hashFile(join(testDirectory, entry.file)) ||
      !entry.clips?.length ||
      entry.clipHashes?.length !== entry.clips.length
    )
      throw new Error(
        `Missing passing recording or changed test source: ${entry.file}`,
      )
    exactSet(
      entry.clipHashes.map((clip) => clip.name),
      entry.clips,
      'Recorded clip hashes',
    )
    for (const clip of entry.clipHashes) {
      if (
        !isHash(clip.rawSha256) ||
        !isHash(clip.spedUpSha256) ||
        !/^[\w.-]+\.mp4$/.test(clip.name)
      )
        throw new Error(`Invalid recorded clip: ${entry.file}`)
    }
    allClips.push(...entry.clips)
  }
  if (new Set(allClips).size !== allClips.length)
    throw new Error('Duplicate suite clips')
}

export function validateSuite(proof, testDirectory, path) {
  if (
    proof?.complete !== true ||
    proof.failedFiles?.length !== 0 ||
    !Number.isFinite(proof.finalDuration) ||
    proof.finalDuration <= 0 ||
    proof.sha256 !== hashFile(path)
  )
    throw new Error(
      'Finish a complete passing integration-test recording with a matching final video',
    )
  validateSuiteRecordings(
    proof.recordings,
    testDirectory,
    integrationTestFiles(testDirectory),
  )
}
