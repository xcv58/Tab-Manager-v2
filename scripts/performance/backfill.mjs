import console from 'node:console'
import { parseArgs } from 'node:util'
import { execFileSync } from 'node:child_process'
import { readFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { platform, arch } from 'node:os'
import { URL } from 'node:url'
import {
  repositoryRoot,
  git,
  sha256,
  fileHash,
  writeRecord,
  writeText,
} from './records.mjs'
import { measurePackage } from './bundles.mjs'
import { recordReport } from './reports.mjs'

const { values } = parseArgs({
  options: {
    since: { type: 'string', default: '2.6.0' },
    output: { type: 'string', default: '.tmp/performance-backfill' },
    id: { type: 'string' },
  },
})
const version = (tag) => tag.replace(/^v/, '').split('.').map(Number)
const order = (a, b) => {
  const aa = version(a),
    bb = version(b)
  return aa[0] - bb[0] || aa[1] - bb[1] || aa[2] - bb[2]
}
if (!/^\d+\.\d+\.\d+$/.test(values.since))
  throw new Error('Expected --since X.Y.Z')
const output = resolve(values.output)
const exec = (args) =>
  execFileSync('gh', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
  })
const pages = exec([
  'api',
  '--paginate',
  'repos/xcv58/Tab-Manager-v2/releases?per_page=100',
  '--jq',
  '.[] | {id,tag_name,published_at,html_url,draft,prerelease,assets:[.assets[]|{id,name,size,digest,browser_download_url}]}',
])
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line))
const releases = pages
  .flat()
  .filter(
    (release) =>
      !release.draft &&
      !release.prerelease &&
      /^v\d+\.\d+\.\d+$/.test(release.tag_name) &&
      order(release.tag_name, values.since) >= 0,
  )
  .sort((a, b) => order(a.tag_name, b.tag_name))
if (!releases.length)
  throw new Error('No published releases in the requested range')
const recordedAt = new Date().toISOString()
const id = values.id || `published-${recordedAt.replaceAll(/[:.]/g, '-')}`
let previous = null
for (const release of releases) {
  const tag = release.tag_name
  const commit = git(['rev-parse', '--verify', `${tag}^{commit}`])
  const pkg = JSON.parse(
    git(['show', `${commit}:packages/extension/package.json`]),
  )
  if (`v${pkg.version}` !== tag)
    throw new Error(`Source version mismatch: ${tag}`)
  const directory = join(output, 'downloads', tag)
  await mkdir(directory, { recursive: true })
  exec([
    'release',
    'download',
    tag,
    '--repo',
    'xcv58/Tab-Manager-v2',
    '--dir',
    directory,
    '--pattern',
    'build_chrome.zip',
    '--pattern',
    'build_firefox.zip',
    '--pattern',
    'SHA256SUMS.txt',
    '--clobber',
  ])
  const checksums = await readFile(join(directory, 'SHA256SUMS.txt'), 'utf8')
  const record = {
    schemaVersion: 1,
    id: `${id}-${tag}`,
    recordedAt,
    source: {
      commit,
      committedAt: git(['show', '-s', '--format=%cI', commit]),
      version: pkg.version,
      label: pkg.version,
      status: 'released',
      tag,
      dirty: false,
      publishedAt: release.published_at,
    },
    provenance: {
      kind: 'published-release-backfill',
      repository: 'xcv58/Tab-Manager-v2',
      runner: `local:${platform()}:${arch()}`,
      releaseId: release.id,
      releaseUrl: release.html_url,
      publishedAt: release.published_at,
      collectorSha256: await fileHash(
        new URL('./bundles.mjs', import.meta.url),
      ),
      note: 'Original GitHub release packages downloaded and inspected at backfill time. ZIP bytes and file contents are historical artifacts; no historical runtime timing is inferred.',
    },
    bundles: [],
    runtime: null,
  }
  for (const browser of ['chrome', 'firefox']) {
    const name = `build_${browser}.zip`
    const asset = release.assets.find((asset) => asset.name === name)
    if (!asset) throw new Error(`Missing published package: ${tag}/${name}`)
    const bytes = await readFile(join(directory, name))
    const digest = sha256(bytes)
    const checksum = checksums
      .split('\n')
      .find((line) => line.trim().split(/\s+/).at(-1)?.endsWith(`/${name}`))
      ?.trim()
      .split(/\s+/)[0]
    if (
      asset.size !== bytes.length ||
      (asset.digest && asset.digest !== `sha256:${digest}`) ||
      checksum !== digest
    )
      throw new Error(`Published digest/size/checksum mismatch: ${tag}/${name}`)
    record.bundles.push({
      ...measurePackage(bytes, browser, pkg.version),
      origin: 'published-release',
      asset: {
        id: asset.id,
        url: asset.browser_download_url,
        digest: asset.digest,
        releaseChecksum: checksum,
      },
    })
  }
  await writeRecord(record, join(output, 'runs'))
  await writeText(
    join(output, `${record.id}.md`),
    recordReport(record, previous),
  )
  previous = record
  console.log(
    `${tag}: original Chrome ${record.bundles[0].zip.bytes} B; Firefox ${record.bundles[1].zip.bytes} B`,
  )
}
await writeText(
  join(output, 'release-inventory.json'),
  JSON.stringify(
    releases.map(({ id, tag_name, published_at, html_url }) => ({
      id,
      tag: tag_name,
      publishedAt: published_at,
      url: html_url,
    })),
    null,
    2,
  ) + '\n',
)
