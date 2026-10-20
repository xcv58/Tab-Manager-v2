import { assert, readJsonAsset } from './github.mjs'

// Both store retries and report capture must interpret interrupted journals the
// same way. An unreadable starter records an uncertain attempt, never a pass.
export async function readStoreReceipts(
  assets,
  store,
  candidate,
  candidateSha256,
) {
  const packageName =
    store === 'firefox' ? 'build_firefox.zip' : 'build_chrome.zip'
  const packageFile = candidate.files.find((file) => file.name === packageName)
  assert(packageFile, `missing ${store} package`)
  const receipts = []
  for (const asset of assets) {
    const match = new RegExp(
      `^store-${store}-(\\d+)-(\\d+)-(\\d+)\\.json$`,
    ).exec(asset.name)
    if (!match) continue
    const saved = await readJsonAsset(asset, 'store receipt')
    if (!saved) {
      assert(
        Number.isFinite(Date.parse(asset.created_at)),
        'invalid incomplete receipt timestamp',
      )
      receipts.push({
        name: asset.name,
        bytes: null,
        receipt: {
          runId: match[1],
          recordedAt: asset.created_at,
          phase: 'unknown',
        },
      })
      continue
    }
    const receipt = saved.value
    assert(
      receipt.schemaVersion === 1 &&
        receipt.store === store &&
        receipt.tag === candidate.source.tag &&
        receipt.commit === candidate.source.commit &&
        receipt.packageSha256 === packageFile.sha256 &&
        receipt.candidateSha256 === candidateSha256 &&
        String(receipt.runId) === match[1] &&
        String(receipt.attempt) === match[2] &&
        typeof receipt.phase === 'string' &&
        receipt.phase.length > 0 &&
        Number.isFinite(Date.parse(receipt.recordedAt)),
      'store receipt belongs to different packages or has invalid identity',
    )
    receipts.push({ name: asset.name, bytes: saved.bytes, receipt })
  }
  return receipts
}

export function storeRetryDecision(receipts, reconciled) {
  if (receipts.some(({ receipt }) => receipt.phase === 'submitted'))
    return 'skip'
  assert(
    !receipts.length || reconciled,
    'previous submission outcome requires store reconciliation; inspect the store and archived operation IDs before explicitly retrying with --reconciled',
  )
  return 'submit'
}

export function summarizeStoreReceipts(store, receipts) {
  const ordered = receipts
    .map(({ receipt }) => receipt)
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
  const latest =
    ordered.findLast((receipt) => receipt.phase === 'submitted') ||
    ordered.at(-1)
  return latest
    ? {
        store,
        state: latest.phase === 'submitted' ? 'submitted' : 'unknown',
        runId: latest.runId,
        recordedAt: latest.recordedAt,
      }
    : null
}
