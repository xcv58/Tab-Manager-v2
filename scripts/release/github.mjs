import { execFileSync } from 'node:child_process'
import { repository, assert } from '../reports/catalog.mjs'
export { repository, assert }
export const gh = (args, options = {}) =>
  execFileSync('gh', args, {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim()
export async function request(path, binary = false) {
  const bytes = execFileSync(
    'gh',
    [
      'api',
      `repos/${repository}/${path}`,
      '-H',
      `Accept: ${binary ? 'application/octet-stream' : 'application/vnd.github+json'}`,
    ],
    { maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  return binary ? bytes : JSON.parse(bytes)
}
export async function optionalRelease(tag) {
  try {
    return await request(`releases/tags/${encodeURIComponent(tag)}`)
  } catch (error) {
    // Pending draft tags are invisible to the by-tag REST endpoint. The
    // authenticated release inventory includes them, so retries recover the ID.
    if (/HTTP 404/.test(String(error.stderr)))
      return (
        (await pages('releases')).find((release) => release.tag_name === tag) ||
        null
      )
    throw error
  }
}
export async function pages(path) {
  const all = []
  for (let page = 1; ; page++) {
    const items = await request(
      `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
    )
    const values = Array.isArray(items)
      ? items
      : items.workflow_runs || items.artifacts || items.jobs
    assert(Array.isArray(values), 'invalid GitHub pagination response')
    all.push(...values)
    if (values.length < 100) return all
  }
}
// Readers never delete assets. A known interrupted upload is unavailable, not
// an empty JSON document or a successfully completed operation.
export async function readJsonAsset(asset, label = 'release JSON asset') {
  assert(
    asset.uploader?.login === 'github-actions[bot]',
    `untrusted ${label}: ${asset.name}`,
  )
  if (asset.state === 'starter') {
    assert(asset.size === 0, `nonempty incomplete ${label}: ${asset.name}`)
    process.stderr.write(
      `Warning: incomplete ${label} ${asset.name}; upload has not completed.\n`,
    )
    return null
  }
  assert(
    asset.state === 'uploaded',
    `unsupported ${label} state: ${asset.name}`,
  )
  assert(
    Number.isSafeInteger(asset.size) &&
      asset.size > 0 &&
      asset.size <= 1_000_000,
    `empty or oversized ${label}: ${asset.name}`,
  )
  const bytes = await request(`releases/assets/${asset.id}`, true)
  assert(bytes.length === asset.size, `changed ${label} size: ${asset.name}`)
  return { bytes, value: JSON.parse(bytes) }
}
export async function completedAsset(release, name) {
  assert(
    Number.isSafeInteger(release?.id) && release.id > 0,
    'missing release ID',
  )
  let existing = (await pages(`releases/${release.id}/assets`)).find(
    (item) => item.name === name,
  )
  if (!existing) return null
  if (existing.state === 'starter') {
    const recoverable = (asset) =>
      assert(
        asset.name === name &&
          asset.size === 0 &&
          asset.uploader?.login === 'github-actions[bot]',
        `refusing to remove untrusted or nonempty incomplete asset ${name}`,
      )
    recoverable(existing)
    const current = await request(`releases/assets/${existing.id}`)
    assert(
      current.id === existing.id && current.name === name,
      `release asset identity changed: ${name}`,
    )
    existing = current
    if (existing.state === 'starter') {
      recoverable(existing)
      // GitHub can leave empty starter assets after a failed upload. Recheck
      // before removing that placeholder; a completed asset is never deleted.
      gh([
        'api',
        '--method',
        'DELETE',
        `repos/${repository}/releases/assets/${existing.id}`,
      ])
      return null
    }
  }
  assert(
    existing.state === 'uploaded',
    `unsupported release asset state for ${name}`,
  )
  return existing
}
export async function uploadImmutable(releaseOrTag, path, name) {
  const { readFile } = await import('node:fs/promises')
  const { basename } = await import('node:path')
  const { sha256 } = await import('../performance/records.mjs')
  name ||= basename(path)
  const release =
    typeof releaseOrTag === 'string'
      ? await optionalRelease(releaseOrTag)
      : releaseOrTag
  const existing = await completedAsset(release, name)
  if (existing) {
    const previous = await request(`releases/assets/${existing.id}`, true)
    assert(
      sha256(previous) === sha256(await readFile(path)),
      `refusing to overwrite release asset ${name}`,
    )
  } else {
    // One upload attempt, including after placeholder cleanup. A further
    // failure stops this invocation instead of entering an automatic retry loop.
    try {
      gh([
        'api',
        '--method',
        'POST',
        `https://uploads.github.com/repos/${repository}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`,
        '-H',
        'Content-Type: application/octet-stream',
        '--input',
        path,
      ])
    } catch (error) {
      throw new Error(
        `Release asset upload failed for ${name}; stopped after one attempt. Retry the reviewed publication to recover an incomplete upload.`,
        { cause: error },
      )
    }
  }
}
