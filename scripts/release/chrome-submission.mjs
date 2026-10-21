import { setTimeout } from 'node:timers/promises'
import { assert } from './github.mjs'
import {
  assertStoreAcceptance,
  chromeSubmissionStates,
} from './store-acceptance.mjs'

function assertItem(value, itemName) {
  assert(
    value?.name === itemName && value.itemId === itemName.split('/').at(-1),
    'Chrome response item identity mismatch',
  )
}

// Poll only upload processing and visibility of the submitted version. Pending
// review is accepted immediately; this never waits for certification/approval.
export async function submitChromePackage({
  itemName,
  identity,
  upload,
  publish,
  fetchStatus,
  checkpoint = async () => {},
  wait = () => setTimeout(10_000),
  attempts = 30,
}) {
  const uploadResult = await upload()
  assertItem(uploadResult, itemName)
  await checkpoint('upload-response', { uploadResult })
  assert(
    ['SUCCEEDED', 'IN_PROGRESS'].includes(uploadResult.uploadState),
    'Chrome package upload did not succeed',
  )
  if (uploadResult.crxVersion)
    assert(
      uploadResult.crxVersion === identity.version,
      'Chrome uploaded version differs from candidate',
    )
  let uploadStatus = null
  if (uploadResult.uploadState === 'SUCCEEDED') {
    assert(
      uploadResult.crxVersion === identity.version,
      'Chrome uploaded version is not verified',
    )
  } else {
    let complete = false
    for (let attempt = 0; attempt < attempts; attempt++) {
      uploadStatus = await fetchStatus()
      assertItem(uploadStatus, itemName)
      const state = uploadStatus.lastAsyncUploadState
      if (state === 'SUCCEEDED') {
        complete = true
        break
      }
      assert(
        state === undefined || ['IN_PROGRESS', 'NOT_FOUND'].includes(state),
        'Chrome asynchronous upload failed or has an unknown state',
      )
      if (attempt + 1 < attempts) await wait()
    }
    assert(
      complete,
      'Chrome upload processing timed out; acceptance is unknown',
    )
  }
  await checkpoint('uploaded', { uploadResult, uploadStatus })
  const publishResult = await publish()
  assertItem(publishResult, itemName)
  assert(
    chromeSubmissionStates.has(publishResult.state),
    'Chrome publish response does not confirm submission',
  )
  await checkpoint('publish-accepted', { publishResult })
  for (let attempt = 0; attempt < attempts; attempt++) {
    const statusResult = await fetchStatus()
    assertItem(statusResult, itemName)
    const revision = [
      statusResult.submittedItemRevisionStatus,
      statusResult.publishedItemRevisionStatus,
    ].find((value) =>
      value?.distributionChannels?.some(
        (channel) => channel.crxVersion === identity.version,
      ),
    )
    if (revision) {
      assert(
        chromeSubmissionStates.has(revision.state),
        'Chrome candidate revision has not been accepted for publication',
      )
      const acceptance = assertStoreAcceptance(
        {
          schemaVersion: 1,
          store: 'chrome',
          ...identity,
          upload: {
            state: 'SUCCEEDED',
            version: uploadResult.crxVersion || null,
          },
          submission: {
            version: identity.version,
            state: revision.state,
            itemName,
          },
        },
        { store: 'chrome', ...identity },
      )
      await checkpoint('status', { statusResult, acceptance })
      return {
        uploadResult,
        uploadStatus,
        publishResult,
        statusResult,
        acceptance,
      }
    }
    if (attempt + 1 < attempts) await wait()
  }
  throw new Error(
    'Chrome submitted candidate version could not be verified; acceptance is unknown',
  )
}
