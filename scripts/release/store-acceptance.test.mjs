import test from 'node:test'
import assert from 'node:assert/strict'
import { submitChromePackage } from './chrome-submission.mjs'
import {
  assertStoreAcceptance,
  confirmedSubmission,
  edgeOperationState,
} from './store-acceptance.mjs'
import {
  storeRetryDecision,
  summarizeStoreReceipts,
} from './store-receipts.mjs'

const itemName = 'publishers/example/items/example-extension'
const item = { name: itemName, itemId: 'example-extension' }
const identity = { version: '3.0.1', packageSha256: 'a'.repeat(64) }
const revision = (version = identity.version, state = 'PENDING_REVIEW') => ({
  state,
  distributionChannels: [{ crxVersion: version }],
})

function chrome(options = {}) {
  const calls = [],
    phases = [],
    statuses = [
      ...(options.statuses || [
        { ...item, submittedItemRevisionStatus: revision() },
      ]),
    ]
  const run = () =>
    submitChromePackage({
      itemName,
      identity,
      attempts: options.attempts || 3,
      upload: async () => {
        calls.push('upload')
        return (
          options.upload || {
            ...item,
            uploadState: 'SUCCEEDED',
            crxVersion: identity.version,
          }
        )
      },
      publish: async () => {
        calls.push('publish')
        return options.publish || { ...item, state: 'PENDING_REVIEW' }
      },
      fetchStatus: async () => {
        calls.push('status')
        assert.ok(statuses.length, 'unexpected status request')
        return statuses.shift()
      },
      wait: async () => {
        calls.push('wait')
      },
      checkpoint: async (phase) => {
        phases.push(phase)
      },
    })
  return { run, calls, phases }
}

test('Chrome pending review confirms the candidate immediately without waiting for approval', async () => {
  const scenario = chrome()
  const { acceptance } = await scenario.run()
  assert.equal(acceptance.submission.state, 'PENDING_REVIEW')
  assert.equal(acceptance.submission.version, identity.version)
  assert.deepEqual(scenario.calls, ['upload', 'publish', 'status'])
  assert.deepEqual(scenario.phases, [
    'upload-response',
    'uploaded',
    'publish-accepted',
    'status',
  ])
})

test('Chrome waits for asynchronous upload processing, then accepts pending review', async () => {
  const scenario = chrome({
    upload: { ...item, uploadState: 'IN_PROGRESS' },
    statuses: [
      { ...item, lastAsyncUploadState: 'IN_PROGRESS' },
      { ...item, lastAsyncUploadState: 'SUCCEEDED' },
      { ...item, submittedItemRevisionStatus: revision() },
    ],
  })
  const { acceptance } = await scenario.run()
  assert.equal(acceptance.upload.state, 'SUCCEEDED')
  assert.deepEqual(scenario.calls, [
    'upload',
    'status',
    'wait',
    'status',
    'publish',
    'status',
  ])
})

for (const uploadState of ['FAILED', 'UNKNOWN', 'UPLOAD_STATE_UNSPECIFIED']) {
  test(`Chrome does not publish an upload with state ${uploadState}`, async () => {
    const scenario = chrome({ upload: { ...item, uploadState } })
    await assert.rejects(scenario.run, /upload did not succeed/)
    assert.deepEqual(scenario.calls, ['upload'])
  })
}

test('Chrome rejects a failed asynchronous upload before publishing', async () => {
  const scenario = chrome({
    upload: { ...item, uploadState: 'IN_PROGRESS' },
    statuses: [{ ...item, lastAsyncUploadState: 'FAILED' }],
  })
  await assert.rejects(scenario.run, /asynchronous upload failed/)
  assert.equal(scenario.calls.includes('publish'), false)
})

test('Chrome rejects a wrong or unverified synchronous upload version before publishing', async () => {
  for (const crxVersion of ['3.0.0', undefined]) {
    const scenario = chrome({
      upload: { ...item, uploadState: 'SUCCEEDED', crxVersion },
    })
    await assert.rejects(scenario.run, /uploaded version/)
    assert.equal(scenario.calls.includes('publish'), false)
  }
})

test('Chrome polls stale revision data only until the intended version is visible', async () => {
  const scenario = chrome({
    statuses: [
      { ...item, publishedItemRevisionStatus: revision('3.0.0', 'PUBLISHED') },
      { ...item, submittedItemRevisionStatus: revision() },
    ],
  })
  const { acceptance } = await scenario.run()
  assert.equal(acceptance.version, identity.version)
  assert.deepEqual(scenario.calls, [
    'upload',
    'publish',
    'status',
    'wait',
    'status',
  ])
})

test('Chrome may confirm an immediately published candidate', async () => {
  const scenario = chrome({
    publish: { ...item, state: 'PUBLISHED' },
    statuses: [
      {
        ...item,
        publishedItemRevisionStatus: revision(identity.version, 'PUBLISHED'),
      },
    ],
  })
  assert.equal((await scenario.run()).acceptance.submission.state, 'PUBLISHED')
})

test('Chrome never confirms a stale version, rejected revision, wrong item, or unknown publish state', async () => {
  const scenarios = [
    chrome({
      attempts: 2,
      statuses: [
        { ...item },
        { ...item, submittedItemRevisionStatus: revision('3.0.0') },
      ],
    }),
    chrome({
      statuses: [
        {
          ...item,
          submittedItemRevisionStatus: revision(identity.version, 'REJECTED'),
        },
      ],
    }),
    chrome({
      upload: {
        name: 'publishers/other/items/other',
        itemId: 'other',
        uploadState: 'SUCCEEDED',
        crxVersion: identity.version,
      },
    }),
    chrome({ publish: { ...item, state: 'ITEM_STATE_UNSPECIFIED' } }),
  ]
  for (const scenario of scenarios) {
    await assert.rejects(scenario.run)
    assert.equal(scenario.phases.includes('status'), false)
  }
})

test('Chrome upload processing has a bounded timeout before any publish request', async () => {
  const scenario = chrome({
    attempts: 2,
    upload: { ...item, uploadState: 'IN_PROGRESS' },
    statuses: [
      { ...item, lastAsyncUploadState: 'NOT_FOUND' },
      { ...item, lastAsyncUploadState: 'IN_PROGRESS' },
    ],
  })
  await assert.rejects(scenario.run, /upload processing timed out/)
  assert.equal(scenario.calls.includes('publish'), false)
})

const edge = {
  schemaVersion: 1,
  store: 'edge',
  ...identity,
  upload: { id: 'upload-id', status: 'Succeeded' },
  submission: { id: 'publish-id', status: 'Succeeded' },
}
const receipt = {
  store: 'edge',
  tag: `v${identity.version}`,
  packageSha256: identity.packageSha256,
  phase: 'submitted',
  runId: '123',
  recordedAt: '2026-10-20T00:00:00Z',
  details: { acceptance: edge },
}

test('Edge accepts only explicit success for the expected operation', () => {
  assert.equal(
    edgeOperationState(
      { id: 'operation', status: 'InProgress' },
      'operation',
      'upload',
    ),
    'InProgress',
  )
  assert.equal(
    edgeOperationState(
      { id: 'operation', status: 'Succeeded' },
      'operation',
      'upload',
    ),
    'Succeeded',
  )
  for (const result of [
    { id: 'operation', status: 'Failed' },
    { id: 'operation', status: 'Cancelled' },
    { id: 'operation' },
    { id: 'another-operation', status: 'Succeeded' },
    { id: 'operation', status: 'Succeeded', errorCode: 'InvalidPackage' },
  ])
    assert.throws(() => edgeOperationState(result, 'operation', 'upload'))
})

test('terminal receipts without acceptance evidence stay unknown and allow a reconciled retry', () => {
  const unverified = { ...receipt, details: undefined }
  assert.equal(confirmedSubmission(unverified), false)
  assert.throws(
    () => storeRetryDecision([{ receipt: unverified }], false),
    /requires store reconciliation/,
  )
  assert.equal(storeRetryDecision([{ receipt: unverified }], true), 'submit')
  assert.equal(
    summarizeStoreReceipts('edge', [{ receipt: unverified }]).state,
    'unknown',
  )
})

test('only validated acceptance for the exact package suppresses a retry', () => {
  assert.equal(confirmedSubmission(receipt), true)
  assert.equal(storeRetryDecision([{ receipt }], true), 'skip')
  for (const change of [
    { version: '3.0.2' },
    { packageSha256: 'b'.repeat(64) },
    { store: 'chrome' },
    { upload: { id: 'upload-id', status: 'InProgress' } },
  ]) {
    const invalid = {
      ...receipt,
      details: { acceptance: { ...edge, ...change } },
    }
    assert.throws(() => storeRetryDecision([{ receipt: invalid }], true))
  }
})

test('Firefox acceptance binds the audited tool contract and exact candidate without waiting for approval', () => {
  const acceptance = {
    schemaVersion: 1,
    store: 'firefox',
    ...identity,
    tool: 'web-ext',
    toolVersion: '10.6.0',
    channel: 'listed',
    approvalTimeout: 0,
  }
  const expected = { store: 'firefox', ...identity }
  assert.equal(assertStoreAcceptance(acceptance, expected), acceptance)
  for (const change of [
    { toolVersion: '11.0.0' },
    { approvalTimeout: 100 },
    { version: '3.0.0' },
  ])
    assert.throws(() =>
      assertStoreAcceptance({ ...acceptance, ...change }, expected),
    )
})
