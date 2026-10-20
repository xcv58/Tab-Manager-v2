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
export async function uploadImmutable(releaseOrTag, path, name) {
  const { readFile } = await import('node:fs/promises')
  const { basename } = await import('node:path')
  const { sha256 } = await import('../performance/records.mjs')
  name ||= basename(path)
  const release =
    typeof releaseOrTag === 'string'
      ? await optionalRelease(releaseOrTag)
      : releaseOrTag
  assert(
    Number.isSafeInteger(release?.id) && release.id > 0,
    'missing release ID',
  )
  const existing = (await pages(`releases/${release.id}/assets`)).find(
    (item) => item.name === name,
  )
  if (existing) {
    const previous = await request(`releases/assets/${existing.id}`, true)
    assert(
      sha256(previous) === sha256(await readFile(path)),
      `refusing to overwrite release asset ${name}`,
    )
  } else
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
}
