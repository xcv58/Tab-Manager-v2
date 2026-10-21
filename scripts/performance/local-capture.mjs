// Local measurements are reviewed Git data. CI validates their identity and
// archives their original bytes; it never executes capture-provided code.
import { lstat, readFile, readdir, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  json,
  sha256,
  validateRecord,
  repositoryRoot,
  runtimeCompatibilityKey,
} from './records.mjs'
import { validateProfile, profileIdentity } from './environment.mjs'

export const capturesDirectory = join(
  repositoryRoot,
  'notes/performance/captures',
)
const hash = /^[a-f0-9]{64}$/
const commit = /^[a-f0-9]{40}$/
const name = /^[a-zA-Z0-9][\w.-]{0,159}$/
const assert = (ok, message) => {
  if (!ok) throw new Error(`Local performance: ${message}`)
}

export function validateLocalCapture(
  capture,
  candidate = capture?.candidate,
  digest = capture?.candidateSha256,
) {
  assert(
    capture?.schemaVersion === 1 &&
      capture.kind === 'local-release-performance',
    'invalid capture schema',
  )
  assert(
    name.test(capture.id || '') &&
      Number.isFinite(Date.parse(capture.recordedAt)),
    'invalid capture identity',
  )
  const saved = capture.candidate
  assert(
    saved?.schemaVersion === 1 &&
      saved.kind === 'release-candidate' &&
      commit.test(saved.source?.commit || '') &&
      /^\d+\.\d+\.\d+$/.test(saved.source.version || '') &&
      saved.source.tag === `v${saved.source.version}` &&
      /^\d+$/.test(String(saved.build?.runId)) &&
      Number.isSafeInteger(saved.build.attempt) &&
      saved.build.attempt > 0 &&
      commit.test(saved.build.controllerCommit || ''),
    'invalid candidate receipt',
  )
  assert(
    Array.isArray(saved.files) &&
      saved.files.length === 3 &&
      [
        'build_chrome.zip',
        'build_firefox.zip',
        'build_firefox_source.zip',
      ].every(
        (expected) =>
          saved.files.filter(
            (file) =>
              file.name === expected &&
              hash.test(file.sha256 || '') &&
              Number.isSafeInteger(file.bytes) &&
              file.bytes > 0,
          ).length === 1,
      ),
    'invalid frozen package inventory',
  )
  assert(
    hash.test(digest || '') &&
      capture.candidateSha256 === digest &&
      sha256(json(saved)) === digest &&
      json(saved) === json(candidate),
    'capture does not match reviewed candidate',
  )
  assert(
    commit.test(capture.baselineCommit || '') &&
      commit.test(capture.referenceCommit || '') &&
      capture.baselineCommit !== saved.source.commit,
    'invalid comparison sources',
  )
  validateProfile(capture.profile)
  assert(
    capture.profile.reference === capture.referenceCommit &&
      commit.test(capture.collectorCommit || ''),
    'invalid collector/reference identity',
  )
  for (const condition of [
    capture.conditions?.before,
    capture.conditions?.after,
  ])
    assert(
      condition &&
        Number.isFinite(Date.parse(condition.recordedAt)) &&
        (!capture.profile.requireACPower || condition.acPower === true) &&
        Array.isArray(condition.loadAverage) &&
        condition.loadAverage.length === 3 &&
        condition.loadAverage.every(
          (value) => Number.isFinite(value) && value >= 0,
        ) &&
        Number.isSafeInteger(condition.freeMemoryBytes) &&
        condition.freeMemoryBytes >= 0,
      'missing measurement conditions',
    )
  assert(
    Array.isArray(capture.files) &&
      capture.files.length >= 3 &&
      capture.files.length <= 4,
    'invalid capture inventory',
  )
  const names = new Set()
  for (const file of capture.files) {
    assert(
      name.test(file.name || '') &&
        file.name.endsWith('.json') &&
        !names.has(file.name) &&
        hash.test(file.sha256 || '') &&
        Number.isSafeInteger(file.bytes) &&
        file.bytes > 0 &&
        file.bytes <= 10_000_000,
      'unsafe, duplicate or oversized record',
    )
    names.add(file.name)
  }
  return capture
}

async function regularFile(path, maxBytes) {
  const info = await lstat(path)
  assert(
    info.isFile() && info.size > 0 && info.size <= maxBytes,
    'expected a bounded regular file',
  )
  const bytes = await readFile(path)
  assert(bytes.length === info.size, 'file changed while reading')
  return bytes
}

export async function readLocalCapture(
  path,
  recordsDirectory,
  { candidate, digest } = {},
) {
  const bytes = await regularFile(path, 100_000)
  const capture = validateLocalCapture(JSON.parse(bytes), candidate, digest)
  const records = []
  for (const file of capture.files) {
    const data = await regularFile(
      join(recordsDirectory, file.name),
      10_000_000,
    )
    assert(
      data.length === file.bytes && sha256(data) === file.sha256,
      `record changed: ${file.name}`,
    )
    const value = validateRecord(JSON.parse(data))
    assert(
      file.name === `${value.id}.json` &&
        value.id.startsWith(`${capture.id}-`) &&
        !value.source.dirty &&
        value.provenance.runner.startsWith('local:') &&
        !value.provenance.workflowRun,
      'invalid local record provenance',
    )
    records.push({ name: file.name, bytes: data, value })
  }
  const source = capture.candidate.source
  const bundles = records.filter((record) => record.value.bundles.length)
  assert(
    bundles.length === 1 &&
      bundles[0].value.source.commit === source.commit &&
      bundles[0].value.source.version === source.version &&
      !bundles[0].value.runtime &&
      bundles[0].value.bundles.length === 2,
    'expected exact release bundle measurements',
  )
  for (const bundle of bundles[0].value.bundles) {
    const file = capture.candidate.files.find(
      (file) => file.name === `build_${bundle.browser}.zip`,
    )
    assert(
      file &&
        file.bytes === bundle.zip.bytes &&
        file.sha256 === bundle.zip.sha256,
      'bundle differs from frozen package',
    )
  }
  const expected = new Set([
    source.commit,
    capture.baselineCommit,
    capture.referenceCommit,
  ])
  const runtime = records.filter((record) => record.value.runtime)
  assert(
    records.length === runtime.length + 1 &&
      runtime.length === expected.size &&
      new Set(runtime.map((record) => record.value.source.commit)).size ===
        expected.size &&
      runtime.every((record) => expected.has(record.value.source.commit)),
    'incomplete or foreign runtime comparison',
  )
  const keys = new Set()
  for (const { value } of runtime) {
    const { environment, compatibilityKey, fixtureFingerprints } = value.runtime
    const profile = capture.profile
    assert(
      value.bundles.length === 0 &&
        environment.browserEngine === 'chromium' &&
        environment.headless === true &&
        environment.node === profile.node &&
        environment.platform === profile.platform &&
        environment.arch === profile.arch &&
        json({
          cpuModels: environment.hardware.cpuModels,
          logicalCores: environment.hardware.logicalCores,
          memoryBytes: environment.hardware.memoryBytes,
        }) === json(profile.hardware) &&
        environment.samplesPerCase === profile.samples &&
        environment.dragSamples === profile.dragSamples &&
        json(environment.sourceTabs) === json(profile.tabs) &&
        environment.referenceCommit === capture.referenceCommit &&
        Object.entries(profileIdentity(profile)).every(
          ([key, value]) => environment[key] === value,
        ),
      'runtime differs from local protocol',
    )
    assert(
      fixtureFingerprints &&
        Array.isArray(value.provenance.harness) &&
        value.provenance.harness.length > 0 &&
        compatibilityKey ===
          runtimeCompatibilityKey(
            environment,
            value.provenance.harness,
            fixtureFingerprints,
          ),
      'changed runtime comparison identity',
    )
    assert(
      value.comparisonBaseline?.commit === capture.baselineCommit &&
        value.comparisonBaseline.referenceCommit === capture.referenceCommit,
      'runtime comparison sources disagree',
    )
    if (value.source.commit === source.commit)
      assert(value.source.version === source.version, 'target version differs')
    keys.add(compatibilityKey)
  }
  assert(keys.size === 1, 'runtime measurements are not comparable')
  return { bytes, capture, records }
}

export async function readCommittedLocalCaptures({
  candidate,
  digest,
  root = repositoryRoot,
} = {}) {
  const directory = join(root, 'notes/performance/captures')
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  const captures = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    assert(
      entry.isFile() && name.test(entry.name) && entry.name.endsWith('.json'),
      'unexpected capture file',
    )
    const result = await readLocalCapture(
      join(directory, entry.name),
      join(root, 'notes/performance/runs'),
    )
    assert(
      entry.name === `${result.capture.id}.json`,
      'capture filename differs from identity',
    )
    if (
      candidate &&
      result.capture.candidate.source.commit !== candidate.source.commit
    )
      continue
    if (candidate) validateLocalCapture(result.capture, candidate, digest)
    captures.push(result)
  }
  return captures
}

export async function importLocalCapture(path, recordsDirectory) {
  const result = await readLocalCapture(path, recordsDirectory)
  const { writeImmutable } = await import('../release/candidate.mjs')
  const targets = result.records.map((record) => ({
    path: join(repositoryRoot, 'notes/performance/runs', record.name),
    bytes: record.bytes,
  }))
  targets.push({
    path: join(capturesDirectory, `${result.capture.id}.json`),
    bytes: result.bytes,
  })
  // Check all immutable conflicts before writing any part of the import.
  for (const file of targets) {
    try {
      assert(
        (await readFile(file.path)).equals(file.bytes),
        `immutable import conflict: ${file.path}`,
      )
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  await mkdir(capturesDirectory, { recursive: true })
  await mkdir(join(repositoryRoot, 'notes/performance/runs'), {
    recursive: true,
  })
  for (const file of targets) await writeImmutable(file.path, file.bytes)
  return result
}
