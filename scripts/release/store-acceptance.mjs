import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { assert } from './github.mjs'
import { json, sha256 } from '../performance/records.mjs'

export const chromeSubmissionStates = new Set([
  'PENDING_REVIEW',
  'STAGED',
  'PUBLISHED',
  'PUBLISHED_TO_TESTERS',
])

export function packageIdentity(path, bytes) {
  const { version } = JSON.parse(
    execFileSync('unzip', ['-p', path, 'manifest.json'], { encoding: 'utf8' }),
  )
  const packageSha256 = sha256(bytes)
  assert(
    typeof version === 'string' && version.length > 0,
    'packaged version is missing',
  )
  assert(
    !process.env.RELEASE_VERSION || process.env.RELEASE_VERSION === version,
    'publisher package version differs from candidate',
  )
  assert(
    !process.env.RELEASE_PACKAGE_SHA256 ||
      process.env.RELEASE_PACKAGE_SHA256 === packageSha256,
    'publisher package bytes differ from candidate',
  )
  return { version, packageSha256 }
}

export function edgeOperationState(result, operationId, kind) {
  assert(
    result?.id === operationId &&
      typeof operationId === 'string' &&
      operationId.length > 0,
    `Edge ${kind} operation identity mismatch`,
  )
  assert(
    ['InProgress', 'Succeeded', 'Failed'].includes(result.status),
    `Edge ${kind} operation has an unknown status`,
  )
  assert(
    result.status !== 'Failed' &&
      !result.errorCode &&
      (!result.errors ||
        (Array.isArray(result.errors) && result.errors.length === 0)),
    `Edge ${kind} failed: ${JSON.stringify(result)}`,
  )
  return result.status
}

export function assertStoreAcceptance(value, expected) {
  assert(
    value?.schemaVersion === 1 &&
      value.store === expected.store &&
      value.version === expected.version &&
      value.packageSha256 === expected.packageSha256,
    'store acceptance does not match the candidate package',
  )
  if (value.store === 'chrome') {
    assert(
      value.upload?.state === 'SUCCEEDED' &&
        (!value.upload.version || value.upload.version === value.version) &&
        value.submission?.version === value.version &&
        chromeSubmissionStates.has(value.submission.state) &&
        /^publishers\/[^/]+\/items\/[^/]+$/.test(
          value.submission.itemName || '',
        ),
      'Chrome candidate acceptance is not verified',
    )
  } else if (value.store === 'edge') {
    assert(
      edgeOperationState(value.upload, value.upload?.id, 'upload') ===
        'Succeeded' &&
        edgeOperationState(
          value.submission,
          value.submission?.id,
          'publish',
        ) === 'Succeeded',
      'Edge candidate acceptance is not verified',
    )
  } else {
    assert(
      value.store === 'firefox' &&
        value.tool === 'web-ext' &&
        value.toolVersion === '10.6.0' &&
        value.channel === 'listed' &&
        value.approvalTimeout === 0,
      'Firefox submission tool contract is not verified',
    )
  }
  return value
}

export async function writeStoreAcceptance(value) {
  if (!process.env.RELEASE_ACCEPTANCE_PATH) return
  assertStoreAcceptance(value, {
    store: process.env.RELEASE_STORE,
    version: process.env.RELEASE_VERSION,
    packageSha256: process.env.RELEASE_PACKAGE_SHA256,
  })
  await writeFile(process.env.RELEASE_ACCEPTANCE_PATH, json(value), {
    flag: 'wx',
  })
}

export function confirmedSubmission(receipt) {
  if (
    receipt.phase !== 'submitted' ||
    receipt.details?.acceptance === undefined
  )
    return false
  assertStoreAcceptance(receipt.details.acceptance, {
    store: receipt.store,
    version: receipt.tag.slice(1),
    packageSha256: receipt.packageSha256,
  })
  return true
}
