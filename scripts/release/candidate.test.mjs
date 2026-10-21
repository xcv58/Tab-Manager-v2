import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertRequiredJobs,
  requiredJobs,
  validateCandidate,
} from './candidate.mjs'

const passedJobs = () =>
  requiredJobs.map((name) => ({ name, conclusion: 'success' }))
test('advisory failures and pending measurements do not block a verified candidate', () => {
  assert.doesNotThrow(() =>
    assertRequiredJobs([
      ...passedJobs(),
      { name: 'Advisory runtime / Compare frozen revisions', conclusion: null },
    ]),
  )
})
for (const conclusion of [
  'failure',
  'cancelled',
  'skipped',
  'timed_out',
  null,
]) {
  test(`a ${conclusion || 'pending'} required check cannot publish`, () => {
    const jobs = passedJobs()
    jobs[2].conclusion = conclusion
    assert.throws(
      () => assertRequiredJobs(jobs),
      /required check is not successful/,
    )
  })
}
test('missing and ambiguous required check receipts fail closed', () => {
  assert.throws(
    () => assertRequiredJobs(passedJobs().slice(1)),
    /Freeze candidate/,
  )
  assert.throws(
    () => assertRequiredJobs([...passedJobs(), passedJobs()[0]]),
    /Freeze candidate/,
  )
})
test('reusable Safari job names are recognized without accepting other checks', () => {
  assert.doesNotThrow(() =>
    assertRequiredJobs(
      passedJobs().map((job) => ({
        ...job,
        name: job.name.startsWith('Safari')
          ? `Safari compilation / ${job.name}`
          : job.name,
      })),
    ),
  )
})
test('candidate identity rejects missing source, version floor and altered package inventory', () => {
  const candidate = {
    schemaVersion: 1,
    kind: 'release-candidate',
    source: { commit: 'a'.repeat(40), version: '3.0.1', tag: 'v3.0.1' },
    build: { runId: '123', attempt: 1, controllerCommit: 'b'.repeat(40) },
    files: [
      'build_chrome.zip',
      'build_firefox.zip',
      'build_firefox_source.zip',
    ].map((name) => ({ name, bytes: 42, sha256: 'c'.repeat(64) })),
  }
  assert.equal(validateCandidate(candidate), candidate)
  assert.throws(
    () =>
      validateCandidate({
        ...candidate,
        source: { ...candidate.source, version: '3.0.0', tag: 'v3.0.0' },
      }),
    /newer than 3.0.0/,
  )
  assert.throws(
    () =>
      validateCandidate({
        ...candidate,
        source: { ...candidate.source, commit: 'master' },
      }),
    /candidate source/,
  )
  assert.throws(
    () =>
      validateCandidate({
        ...candidate,
        files: [candidate.files[0], candidate.files[0], candidate.files[2]],
      }),
    /invalid package/,
  )
})
