// Upload and App Review are separate explicitly dispatched controls. Neither
// path releases an approved version, changes availability, or withdraws review.
import { execFileSync } from 'node:child_process'
import {
  appendFile,
  chmod,
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { setTimeout } from 'node:timers'
import { assert, pages, repository } from './github.mjs'
import { releasedCandidate } from './publish.mjs'
import { readStoreReceipts } from './store-receipts.mjs'
import { checkpoint } from './journal.mjs'
import { json, sha256 } from '../performance/records.mjs'
import { appleClient, appleUploads, matchingAppleBuild } from './safari-api.mjs'
import { safari, safariUploadDecision } from './safari-model.mjs'

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const relation = (type, id) => ({ data: { type, id } })
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value
const metadataHash = (value) => sha256(json(canonical(value)))

async function gallerySnapshot(apple, localeId) {
  const gallery = []
  for (const [sets, assets] of [
    ['appScreenshotSets', 'appScreenshots'],
    ['appPreviewSets', 'appPreviews'],
  ]) {
    const groups = await apple.list(
      `/v1/appStoreVersionLocalizations/${localeId}/${sets}?limit=200`,
    )
    for (const group of groups) {
      const items = await apple.list(
        `/v1/${sets}/${group.id}/${assets}?limit=200`,
      )
      gallery.push({
        id: group.id,
        ...group.attributes,
        assets: items.map(({ id, attributes: a }) => ({
          id,
          fileName: a.fileName,
          fileSize: a.fileSize,
          sourceFileChecksum: a.sourceFileChecksum,
          assetDeliveryState: a.assetDeliveryState,
          previewFrameTimeCode: a.previewFrameTimeCode,
        })),
      })
    }
  }
  return gallery.sort((a, b) => a.id.localeCompare(b.id))
}

export async function processedBuild(apple, candidate, record) {
  for (let poll = 0; poll < 60; poll++) {
    const build = await matchingAppleBuild(apple, candidate)
    if (build) {
      assert(
        !build.attributes.expired &&
          !['FAILED', 'INVALID'].includes(build.attributes.processingState),
        'Apple rejected/expired this build. Inspect Apple diagnostics; prepare a new candidate if bytes must change.',
      )
      if (build.attributes.processingState === 'VALID') {
        await record('processed', {
          buildId: build.id,
          processingState: 'VALID',
          buildNumber: candidate.safari.buildNumber,
        })
        return build
      }
    }
    await pause(30000)
  }
  throw new Error(
    'Apple processing is still pending after 30 minutes. Resume the same candidate; do not rebuild/reupload it.',
  )
}

async function testFlight(apple, candidate, previous) {
  const groupId = process.env.SAFARI_INTERNAL_GROUP_ID
  assert(
    /^[a-fA-F0-9-]{36}$/.test(groupId || ''),
    'Set SAFARI_INTERNAL_GROUP_ID to the existing internal TestFlight group UUID in safari-app-store variables',
  )
  const { data: group } = await apple.api(`/v1/betaGroups/${groupId}`)
  const { data: app } = await apple.api(`/v1/betaGroups/${groupId}/app`)
  assert(
    group.attributes.isInternalGroup && app.id === safari.appId,
    'TestFlight target is not an existing internal group of Tab Manager v2',
  )
  const observed = await matchingAppleBuild(apple, candidate)
  const uploads = (await appleUploads(apple)).filter(
    (u) => u.attributes.cfBundleVersion === candidate.safari.buildNumber,
  )
  if (
    safariUploadDecision({
      build: observed,
      uploads,
      receipts: previous,
      reconciled: process.env.RELEASE_RECONCILED === 'true',
      version: candidate.source.version,
    }) === 'upload'
  ) {
    // A previously accepted Apple build can still resume group/processing
    // checks after local signing inputs expire. New transport cannot.
    for (const value of [
      ...candidate.safari.signing.profiles,
      ...candidate.safari.signing.certificates,
    ])
      assert(
        Date.parse(value.expiresAt) > Date.now(),
        'Candidate signing input expired; prepare and review a new candidate',
      )
    const temporary = await mkdtemp(join(tmpdir(), 'tm-safari-upload-'))
    await chmod(temporary, 0o700)
    try {
      await writeFile(
        join(temporary, `AuthKey_${process.env.ASC_KEY_ID}.p8`),
        process.env.ASC_PRIVATE_KEY,
        { mode: 0o600 },
      )
      // Durable intent must exist before transport starts. A killed process is
      // reconciled against Apple by app/version/build, never retried blindly.
      await checkpoint('upload-started', {
        buildNumber: candidate.safari.buildNumber,
      })
      try {
        execFileSync(
          'xcrun',
          [
            'altool',
            '--upload-app',
            '--type',
            'macos',
            '--file',
            resolve('.tmp/safari-delivery', safari.packageName),
            '--apiKey',
            process.env.ASC_KEY_ID,
            '--apiIssuer',
            process.env.ASC_ISSUER_ID,
            '--output-format',
            'json',
          ],
          {
            env: { ...process.env, API_PRIVATE_KEYS_DIR: temporary },
            timeout: 15 * 60000,
            maxBuffer: 8 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        )
      } catch {
        throw new Error(
          'Safari transport did not confirm success. Inspect Apple Build Uploads before retrying this exact package; no automatic transport retry was attempted.',
        )
      }
      await checkpoint('upload-accepted', {
        buildNumber: candidate.safari.buildNumber,
        note: 'Transport accepted; processing and tester access remain unconfirmed.',
      })
    } finally {
      await rm(temporary, { recursive: true, force: true })
    }
  }
  const build = await processedBuild(apple, candidate, checkpoint)
  const groupBuilds = () =>
    apple.list(`/v1/betaGroups/${groupId}/builds?limit=200`)
  if (!(await groupBuilds()).some((b) => b.id === build.id)) {
    await checkpoint('testers-started', { buildId: build.id, groupId })
    await apple.api(`/v1/betaGroups/${groupId}/relationships/builds`, 'POST', [
      { type: 'builds', id: build.id },
    ])
  }
  for (let poll = 0; poll < 10; poll++) {
    const { data: detail } = await apple.api(
      `/v1/builds/${build.id}/buildBetaDetail`,
    )
    if (
      (await groupBuilds()).some((b) => b.id === build.id) &&
      ['READY_FOR_BETA_TESTING', 'IN_BETA_TESTING'].includes(
        detail.attributes.internalBuildState,
      )
    ) {
      await checkpoint('testers-available', {
        buildId: build.id,
        groupId,
        internalBuildState: detail.attributes.internalBuildState,
      })
      return
    }
    await pause(30000)
  }
  throw new Error(
    'Processed build exists, but internal TestFlight access is not yet confirmed. Resume Safari to recheck; do not upload again.',
  )
}

export async function versionSnapshot(apple, version) {
  const { data: current } = await apple.api(
    `/v1/appStoreVersions/${version.id}`,
  )
  const { data: build } = await apple.api(
    `/v1/appStoreVersions/${version.id}/relationships/build`,
  )
  const localizations = (
    await apple.list(
      `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=200`,
    )
  )
    .map(({ id, attributes }) => ({ id, ...attributes }))
    .sort((a, b) => a.locale.localeCompare(b.locale))
  for (const locale of localizations)
    locale.gallery = await gallerySnapshot(apple, locale.id)
  let reviewDetailsSha256 = null
  try {
    const { data: review } = await apple.api(
      `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`,
    )
    // Review contact information and demo login credentials must never enter
    // public GitHub receipts/logs. Keep only an opaque digest for change detection.
    reviewDetailsSha256 = review ? metadataHash(review.attributes) : null
  } catch (error) {
    if (error.status !== 404) throw error
  }
  // Review state changes after adding/submitting an item are not listing edits.
  // Keep those states in the receipt, outside the metadata approval digest.
  const { appStoreState, appVersionState, ...attributes } = current.attributes
  const snapshot = {
    id: current.id,
    attributes,
    buildId: build?.id || null,
    localizations,
    reviewDetailsSha256,
  }
  return {
    snapshot,
    digest: metadataHash(snapshot),
    appStoreState,
    appVersionState,
  }
}
export function assertReviewedListing(snapshot, candidate, buildId) {
  assert(
    snapshot.attributes.platform === 'MAC_OS' &&
      snapshot.attributes.versionString === candidate.source.version &&
      snapshot.attributes.releaseType === 'MANUAL' &&
      snapshot.buildId === buildId,
    'App Store version/build/manual-release setting differs',
  )
  for (const [locale, text] of Object.entries(candidate.safari.whatsNew))
    assert(
      snapshot.localizations.find((l) => l.locale === locale)?.whatsNew ===
        text,
      `App Store ${locale} notes differ from the reviewed candidate`,
    )
}

async function appStore(apple, candidate, previous, action) {
  const build = await matchingAppleBuild(apple, candidate)
  assert(
    build?.attributes.processingState === 'VALID' && !build.attributes.expired,
    'Promote only the recorded, valid processed build',
  )
  assert(
    previous.some(
      ({ receipt }) =>
        receipt.phase === 'processed' && receipt.details?.buildId === build.id,
    ),
    'Missing durable processed-build receipt; resume Safari delivery first',
  )
  const versions = await apple.list(
    `/v1/apps/${safari.appId}/appStoreVersions?filter[platform]=MAC_OS&limit=200`,
  )
  let version = versions.find(
    (v) => v.attributes.versionString === candidate.source.version,
  )
  const submissions = await apple.list(
    `/v1/reviewSubmissions?filter[app]=${safari.appId}&filter[platform]=MAC_OS&limit=200`,
  )
  const active = submissions.filter((s) => s.attributes.state !== 'COMPLETE')
  let own
  for (const submission of active) {
    const items = await apple.list(
      `/v1/reviewSubmissions/${submission.id}/items?include=appStoreVersion&limit=200`,
    )
    const recordedEmpty =
      submission.attributes.state === 'READY_FOR_REVIEW' &&
      !items.length &&
      previous.some(
        ({ receipt }) =>
          receipt.phase === 'app-store-review-created' &&
          receipt.details?.reviewSubmissionId === submission.id &&
          receipt.details.versionId === version?.id,
      )
    assert(
      version &&
        (recordedEmpty ||
          (items.length === 1 &&
            items[0].relationships?.appStoreVersion?.data?.id === version.id)),
      'An existing App Review submission must be handled manually; nothing was withdrawn or replaced',
    )
    if (recordedEmpty) submission.needsItem = true
    assert(
      !own,
      'Multiple existing App Review submissions require manual reconciliation',
    )
    own = submission
  }
  if (action === 'status') {
    const state = version
      ? await versionSnapshot(apple, version)
      : { snapshot: null, digest: null }
    await checkpoint('app-store-status', {
      buildId: build.id,
      ...state,
      reviewState: own?.attributes.state || null,
    })
    process.stdout.write(`${json(state)}\n`)
    return state
  }
  if (action === 'prepare') {
    assert(
      !active.length,
      'Existing App Review submission: preparation will not modify it',
    )
    if (version)
      assert(
        [
          'PREPARE_FOR_SUBMISSION',
          'DEVELOPER_REJECTED',
          'REJECTED',
          'METADATA_REJECTED',
        ].includes(version.attributes.appStoreState),
        'App Store version is not editable; preserve its current submission/release state',
      )
    // A different editable version must not be replaced by creating this one.
    assert(
      !versions.some(
        (v) =>
          v.id !== version?.id &&
          [
            'PREPARE_FOR_SUBMISSION',
            'DEVELOPER_REJECTED',
            'REJECTED',
            'METADATA_REJECTED',
          ].includes(v.attributes.appStoreState),
      ),
      'Another editable macOS version exists; reconcile it manually',
    )
    if (!version) {
      await checkpoint('app-store-prepare-started', { buildId: build.id })
      ;({ data: version } = await apple.api('/v1/appStoreVersions', 'POST', {
        type: 'appStoreVersions',
        attributes: {
          platform: 'MAC_OS',
          versionString: candidate.source.version,
          releaseType: 'MANUAL',
        },
        relationships: {
          app: relation('apps', safari.appId),
          build: relation('builds', build.id),
        },
      }))
    }
    const before = await versionSnapshot(apple, version)
    assert(
      !before.snapshot.buildId || before.snapshot.buildId === build.id,
      'App Store version already selects another build; refuse to replace it',
    )
    await checkpoint('app-store-prepare-started', {
      buildId: build.id,
      versionId: version.id,
    })
    await apple.api(`/v1/appStoreVersions/${version.id}`, 'PATCH', {
      type: 'appStoreVersions',
      id: version.id,
      attributes: { releaseType: 'MANUAL' },
      relationships: { build: relation('builds', build.id) },
    })
    for (const [locale, text] of Object.entries(candidate.safari.whatsNew)) {
      const localization = before.snapshot.localizations.find(
        (l) => l.locale === locale,
      )
      assert(
        localization,
        `Missing existing ${locale} listing. Prepare its listing/screenshots manually; automation only updates reviewed What’s New text.`,
      )
      if (localization.whatsNew !== text)
        await apple.api(
          `/v1/appStoreVersionLocalizations/${localization.id}`,
          'PATCH',
          {
            type: 'appStoreVersionLocalizations',
            id: localization.id,
            attributes: { whatsNew: text },
          },
        )
    }
    const after = await versionSnapshot(apple, version)
    assertReviewedListing(after.snapshot, candidate, build.id)
    await checkpoint('app-store-prepared', {
      buildId: build.id,
      versionId: version.id,
      ...after,
    })
    process.stdout.write(
      `Review the full App Store listing, screenshots and review details in Apple. Metadata approval digest: ${after.digest}\n`,
    )
    return after
  }
  assert(
    action === 'submit' && version,
    'Prepare the App Store version before submitting',
  )
  const state = await versionSnapshot(apple, version)
  assertReviewedListing(state.snapshot, candidate, build.id)
  assert(
    /^[a-f0-9]{64}$/.test(process.env.SAFARI_METADATA_SHA256 || '') &&
      state.digest === process.env.SAFARI_METADATA_SHA256,
    'Apple metadata changed or was not explicitly approved. Run status and review its new metadata digest before submitting.',
  )
  if (own && own.attributes.state !== 'READY_FOR_REVIEW') {
    assert(
      ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'COMPLETING'].includes(
        own.attributes.state,
      ),
      'Existing submission needs manual attention; no submission was changed',
    )
    await checkpoint('app-store-submitted', {
      buildId: build.id,
      versionId: version.id,
      reviewSubmissionId: own.id,
      reviewState: own.attributes.state,
      metadataSha256: state.digest,
    })
    return state
  }
  assert(
    [
      'PREPARE_FOR_SUBMISSION',
      'DEVELOPER_REJECTED',
      'REJECTED',
      'METADATA_REJECTED',
      'READY_FOR_REVIEW',
    ].includes(version.attributes.appStoreState),
    'App Store version is not in a submittable state',
  )
  await checkpoint('app-store-submit-started', {
    buildId: build.id,
    versionId: version.id,
    metadataSha256: state.digest,
  })
  if (!own) {
    ;({ data: own } = await apple.api('/v1/reviewSubmissions', 'POST', {
      type: 'reviewSubmissions',
      attributes: { platform: 'MAC_OS' },
      relationships: { app: relation('apps', safari.appId) },
    }))
    await checkpoint('app-store-review-created', {
      buildId: build.id,
      versionId: version.id,
      reviewSubmissionId: own.id,
    })
    own.needsItem = true
  }
  if (own.needsItem) {
    await apple.api('/v1/reviewSubmissionItems', 'POST', {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: relation('reviewSubmissions', own.id),
        appStoreVersion: relation('appStoreVersions', version.id),
      },
    })
  }
  // Set platform and submit in separate API operations (Apple rejects combining
  // these attributes for some existing submissions).
  await apple.api(`/v1/reviewSubmissions/${own.id}`, 'PATCH', {
    type: 'reviewSubmissions',
    id: own.id,
    attributes: { platform: 'MAC_OS' },
  })
  const final = await versionSnapshot(apple, version)
  assert(
    final.digest === state.digest,
    'Metadata changed during submission preparation; review status again',
  )
  const finalItems = await apple.list(
    `/v1/reviewSubmissions/${own.id}/items?include=appStoreVersion&limit=200`,
  )
  assert(
    finalItems.length === 1 &&
      finalItems[0].relationships?.appStoreVersion?.data?.id === version.id,
    'Review submission item changed; nothing was submitted',
  )
  await apple.api(`/v1/reviewSubmissions/${own.id}`, 'PATCH', {
    type: 'reviewSubmissions',
    id: own.id,
    attributes: { submitted: true },
  })
  const { data: submitted } = await apple.api(`/v1/reviewSubmissions/${own.id}`)
  assert(
    ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'COMPLETING', 'COMPLETE'].includes(
      submitted.attributes.state,
    ),
    'Apple submission is not confirmed; reconcile its status before retrying',
  )
  await checkpoint('app-store-submitted', {
    buildId: build.id,
    versionId: version.id,
    reviewSubmissionId: own.id,
    reviewState: submitted.attributes.state,
    metadataSha256: state.digest,
  })
  return state
}

async function main() {
  assert(
    process.env.GITHUB_REPOSITORY === repository &&
      process.env.GITHUB_REF_NAME === 'master',
    'Safari delivery requires trusted master',
  )
  const directory = resolve('.tmp/safari-delivery')
  const { candidate, release } = await releasedCandidate(
    process.env.RELEASE_TAG,
    directory,
    process.env.CANDIDATE_SHA256,
  )
  assert(candidate.safari, 'Reviewed candidate does not contain Safari')
  process.env.RELEASE_STORE = 'safari'
  process.env.RELEASE_SOURCE = candidate.source.commit
  process.env.RELEASE_PACKAGE_SHA256 = candidate.files.find(
    (f) => f.name === safari.packageName,
  ).sha256
  process.env.RELEASE_JOURNAL_DIR = resolve('.tmp/store-receipts')
  const previous = await readStoreReceipts(
    await pages(`releases/${release.id}/assets`),
    'safari',
    candidate,
    process.env.CANDIDATE_SHA256,
  )
  const apple = appleClient()
  await apple.checkApp()
  const action = process.env.SAFARI_ACTION || 'testflight'
  let metadata
  try {
    if (action === 'testflight') await testFlight(apple, candidate, previous)
    else metadata = await appStore(apple, candidate, previous, action)
  } catch (error) {
    await checkpoint('unknown', { action, reason: error.message })
    throw error
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    await mkdir(directory, { recursive: true })
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `## Safari ${candidate.source.version} (${candidate.safari.buildNumber})\n\nAction: ${action}. Source: ${candidate.source.commit}.\n\nPackage SHA-256: ${process.env.RELEASE_PACKAGE_SHA256}\n\n${metadata?.digest ? `Metadata review digest: ${metadata.digest}\n\n` : ''}See immutable store-safari receipts for transport, processing, internal tester access and App Review states. Approval/public availability require separate verification. Release remains manual.\n`,
    )
  }
}
if (process.argv[1] === import.meta.filename) await main()
