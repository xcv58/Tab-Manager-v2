// Publisher checkpoints contain operation/status data only, never credentials.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { uploadImmutable } from './github.mjs'
import { json } from '../performance/records.mjs'
let sequence = 0
export async function checkpoint(phase, details = {}) {
  if (!process.env.RELEASE_JOURNAL_DIR) return
  await mkdir(process.env.RELEASE_JOURNAL_DIR, { recursive: true })
  const receipt = {
    schemaVersion: 1,
    store: process.env.RELEASE_STORE,
    tag: process.env.RELEASE_TAG,
    commit: process.env.RELEASE_SOURCE,
    packageSha256: process.env.RELEASE_PACKAGE_SHA256,
    candidateSha256: process.env.CANDIDATE_SHA256,
    runId: process.env.GITHUB_RUN_ID,
    attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
    recordedAt: new Date().toISOString(),
    phase,
    details,
  }
  const ordinal = Number(process.env.RELEASE_JOURNAL_SEQUENCE || 0) + ++sequence
  const name = `store-${receipt.store}-${receipt.runId}-${receipt.attempt}-${String(ordinal).padStart(3, '0')}.json`
  const path = join(process.env.RELEASE_JOURNAL_DIR, name)
  await writeFile(path, json(receipt))
  // Persist before the next store operation. An interrupted run leaves a visible
  // uncertain attempt rather than permitting an automatic duplicate submission.
  await uploadImmutable(receipt.tag, path)
}
