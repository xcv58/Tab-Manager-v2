// Offline contracts shared by candidate review, delivery, and report import.
import { assert } from './github.mjs'

export const safari = Object.freeze({
  appId: '6758364114',
  teamId: '5736QK4NZX',
  bundleId: 'com.xcv58.Tab-Manager-v2',
  extensionId: 'com.xcv58.Tab-Manager-v2.Extension',
  appGroup: '5736QK4NZX.com.xcv58.Tab-Manager-v2',
  packageName: 'safari-app-store.pkg',
  archiveName: 'safari-archive.zip',
  ledgerTag: 'safari-build-ledger',
  xcode: '26.3',
  xcodeBuild: '17C529',
  xcodegen: '2.46.0',
})
export const safariFiles = [safari.packageName, safari.archiveName]
const hash = /^[a-f0-9]{64}$/
export const safariNotesPath = (version) =>
  `promotional_tiles/store-listings/releases/${version}/safari-release.json`

export function safariUploadDecision({
  build,
  uploads,
  receipts,
  reconciled,
  version,
}) {
  const attempts = receipts.filter(({ receipt }) =>
    [
      'upload-started',
      'upload-accepted',
      'processed',
      'testers-available',
    ].includes(receipt.phase),
  )
  for (const upload of uploads)
    assert(
      upload.attributes.cfBundleShortVersionString === version,
      'Apple upload build number belongs to another version',
    )
  assert(
    (!build && !uploads.length) || attempts.length,
    'Apple already has this build without an upload receipt. Reconcile the manual-upload collision; never assume it contains the approved bytes.',
  )
  const ids = attempts
    .map(({ receipt }) => receipt.details?.buildId)
    .filter(Boolean)
  assert(
    !build || ids.every((id) => id === build.id),
    'Apple build differs from archived receipt',
  )
  assert(
    !uploads.some((u) => u.attributes.state?.state === 'FAILED'),
    'Apple upload failed; inspect its errors before preparing a new candidate',
  )
  if (build || uploads.length) return 'resume'
  assert(
    (!attempts.length &&
      receipts.every(({ receipt }) => receipt.phase !== 'unknown')) ||
      reconciled,
    'Previous upload outcome is uncertain. Check Apple Build Uploads and archived receipts, then resume the same package with --reconciled only after confirming it was not accepted.',
  )
  return 'upload'
}

export function validateSafariNotes(notes) {
  assert(
    notes && typeof notes === 'object' && !Array.isArray(notes),
    'Safari notes must map existing Apple locales to reviewed What’s New text',
  )
  assert(Object.keys(notes).length > 0, 'Safari release notes are empty')
  for (const [locale, text] of Object.entries(notes))
    assert(
      /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) &&
        typeof text === 'string' &&
        text.trim() &&
        text.length <= 4000,
      `invalid Safari release notes: ${locale}`,
    )
  return notes
}

export function validateSafari(value, source, build) {
  assert(
    value?.appId === safari.appId &&
      value.bundleId === safari.bundleId &&
      value.extensionId === safari.extensionId &&
      value.appGroup === safari.appGroup &&
      value.teamId === safari.teamId,
    'Safari production identity differs',
  )
  assert(
    /^[1-9]\d{0,8}$/.test(value.buildNumber) &&
      value.version === source.version &&
      value.commit === source.commit,
    'Safari source/version/build differs',
  )
  assert(
    String(value.runId) === String(build.runId) &&
      value.attempt === build.attempt,
    'Safari package belongs to another candidate attempt',
  )
  assert(
    value.toolchain?.xcode === safari.xcode &&
      value.toolchain.xcodeBuild === safari.xcodeBuild &&
      value.toolchain.xcodegen === safari.xcodegen &&
      value.toolchain.runner === 'macos-15',
    'Safari toolchain differs from pinned configuration',
  )
  assert(
    value.architectures?.join(',') === 'arm64,x86_64' &&
      hash.test(value.webResourcesSha256),
    'Safari architecture/resource evidence missing',
  )
  assert(
    /^[A-F0-9]{40}$/.test(value.signing?.applicationCertificate) &&
      /^[A-F0-9]{40}$/.test(value.signing.installerCertificate),
    'Safari distribution signing evidence missing',
  )
  assert(
    value.signing.certificates?.length === 2 &&
      value.signing.certificates.every(
        (c) =>
          Number.isFinite(Date.parse(c.expiresAt)) &&
          /^[A-F0-9]{64}$/.test(c.sha256),
      ),
    'Safari certificate expiry evidence missing',
  )
  assert(
    value.signing.profiles?.length === 2,
    'Safari needs two distribution profiles',
  )
  for (const id of [safari.bundleId, safari.extensionId]) {
    const profile = value.signing.profiles.find((p) => p.bundleId === id)
    assert(
      profile &&
        /^[A-Fa-f0-9-]{36}$/.test(profile.uuid) &&
        Number.isFinite(Date.parse(profile.expiresAt)),
      'Safari profile identity missing',
    )
  }
  validateSafariNotes(value.whatsNew)
  return value
}

export function safariSummary(receipts) {
  const ordered = receipts
    .map(({ receipt }) => receipt)
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
  const latest = ordered.at(-1)
  if (!latest) return null
  const stages = {}
  for (const receipt of ordered)
    if (
      [
        'upload-accepted',
        'processed',
        'testers-available',
        'app-store-prepared',
        'app-store-submitted',
        'app-store-status',
      ].includes(receipt.phase)
    )
      stages[receipt.phase] = receipt.details
  return {
    store: 'safari',
    state: stages['app-store-submitted']
      ? 'submitted'
      : stages['testers-available']
        ? 'testers-available'
        : stages.processed
          ? 'processed'
          : stages['upload-accepted']
            ? 'uploaded'
            : 'unknown',
    runId: latest.runId,
    recordedAt: latest.recordedAt,
    latestPhase: latest.phase,
    stages,
  }
}
