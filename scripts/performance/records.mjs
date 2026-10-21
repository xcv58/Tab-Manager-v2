import { createHash } from 'node:crypto'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { execFileSync } from 'node:child_process'

export const repositoryRoot = resolve(import.meta.dirname, '../..')
export const archiveDirectory = join(repositoryRoot, 'notes/performance/runs')
export const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')
export const json = (value) => JSON.stringify(value, null, 2) + '\n'
export const git = (args, cwd = repositoryRoot) =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()

export function runtimeCompatibilityKey(
  environment,
  harness,
  fixtureFingerprints,
) {
  return sha256(
    json({
      environment: {
        ...environment,
        samplesPerCase: undefined,
        dragSamples: undefined,
      },
      harness,
      fixtureFingerprints,
    }),
  )
}

export function statistics(values) {
  if (!values.length || values.some((value) => !Number.isFinite(value)))
    throw new Error('Measurements must contain finite numbers.')
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return {
    count: sorted.length,
    median:
      sorted.length % 2
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2,
    min: sorted[0],
    max: sorted.at(-1),
  }
}

export function summarizeRuntime(runtime) {
  if (!runtime) return null
  const workloads = [...new Set(runtime.samples.map((sample) => sample.tabs))]
    .sort((a, b) => a - b)
    .map((tabs) => {
      const samples = runtime.samples.filter((sample) => sample.tabs === tabs)
      const metric = (get) => statistics(samples.map(get))
      return {
        sourceTabs: tabs,
        totalTabs: samples[0].startup.tabCount,
        startup: metric((sample) => sample.startup.readyMs),
        searchPaint: metric((sample) => sample.search.Needle.searchPaintMs),
        narrowSearch: metric(
          (sample) => sample.search.Needle.searchWorkspaceMs,
        ),
        broadSearch: metric((sample) => sample.search.Work.searchWorkspaceMs),
        startupHeap: metric((sample) => sample.heap.usedSize),
      }
    })
  const drags = runtime.drags
  return {
    workloads,
    drag: drags.length
      ? {
          tabCounts: [
            ...new Set(drags.map((sample) => sample.after.tabCount)),
          ].sort((a, b) => a - b),
          ...Object.fromEntries(
            Object.entries({
              render: (sample) => sample.after.dragRenderMs,
              largestRender: (sample) => sample.after.dragMaxCommitRenderMs,
              largestLongTask: (sample) => sample.after.maxLongTaskMs,
              peakRows: (sample) => sample.after.dragMaxRows,
              postDropHeap: (sample) => sample.heap.usedSize,
              postScrollHeap: (sample) => sample.scroll.afterHeap.usedSize,
              detachedReferences: (sample) =>
                sample.scroll.state.retainedReferences.detachedNodeRefs,
            }).map(([key, get]) => [key, statistics(drags.map(get))]),
          ),
        }
      : null,
  }
}

const safeId = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$/
const hash = /^[a-f0-9]{64}$/
const finite = (value) => Number.isFinite(value) && value >= 0

export function validateRecord(record) {
  const fail = (message) => {
    throw new Error(`Invalid performance record: ${message}`)
  }
  if (record?.schemaVersion !== 1) fail('unsupported schemaVersion')
  if (!safeId.test(record.id || '')) fail('unsafe id')
  if (!Number.isFinite(Date.parse(record.recordedAt))) fail('recordedAt')
  if (!/^[a-f0-9]{40}$/.test(record.source?.commit || '')) fail('source commit')
  if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(record.source.version || ''))
    fail('source version')
  if (!['released', 'candidate'].includes(record.source.status)) fail('status')
  if (
    !Number.isFinite(Date.parse(record.source.committedAt)) ||
    typeof record.source.dirty !== 'boolean' ||
    typeof record.source.label !== 'string' ||
    record.source.label.length > 180
  )
    fail('source metadata')
  if (typeof record.provenance?.runner !== 'string') fail('runner provenance')
  if (!Array.isArray(record.bundles)) fail('bundles')
  const browsers = new Set()
  for (const bundle of record.bundles) {
    if (
      !['chrome', 'firefox'].includes(bundle.browser) ||
      browsers.has(bundle.browser)
    )
      fail('bundle browser')
    browsers.add(bundle.browser)
    if (!finite(bundle.zip?.bytes) || !hash.test(bundle.zip.sha256 || ''))
      fail('ZIP bytes/hash')
    if (!hash.test(bundle.contentSha256 || '')) fail('package content hash')
    if (!Array.isArray(bundle.files) || !bundle.files.length)
      fail('package files')
    const paths = new Set()
    for (const file of bundle.files) {
      if (
        typeof file.path !== 'string' ||
        !file.path ||
        file.path.startsWith('/') ||
        file.path.split(/[\\/]/).includes('..') ||
        paths.has(file.path) ||
        !finite(file.bytes) ||
        !hash.test(file.sha256 || '')
      )
        fail('package file')
      paths.add(file.path)
    }
    for (const key of [
      'unpackedBytes',
      'popupJsBytes',
      'popupCssBytes',
      'backgroundJsBytes',
      'settingsPreviewBytes',
    ])
      if (!finite(bundle.summary?.[key])) fail(`bundle summary ${key}`)
    const total = bundle.files.reduce((sum, file) => sum + file.bytes, 0)
    if (total !== bundle.summary.unpackedBytes)
      fail('unpacked bytes disagree with files')
    for (const [metric, match] of [
      ['popupJsBytes', (file) => file.path === 'popup.js'],
      ['popupCssBytes', (file) => file.path === 'popup.css'],
      ['backgroundJsBytes', (file) => file.path === 'background.js'],
      [
        'settingsPreviewBytes',
        (file) => file.path.startsWith('settings-preview'),
      ],
    ])
      if (
        bundle.summary[metric] !==
        bundle.files.filter(match).reduce((sum, file) => sum + file.bytes, 0)
      )
        fail(`summary disagrees with files: ${metric}`)
    const startup = bundle.startupFiles || bundle.summary.startupNames
    if (
      startup &&
      (!Array.isArray(startup) || startup.some((path) => !paths.has(path)))
    )
      fail('startup files')
    const contentHash = sha256(
      bundle.files
        .map((file) => `${file.path}\0${file.bytes}\0${file.sha256}\n`)
        .join(''),
    )
    if (contentHash !== bundle.contentSha256)
      fail('package content hash disagrees with files')
  }
  if (record.runtime !== null) {
    const runtime = record.runtime
    if (!hash.test(runtime?.compatibilityKey || ''))
      fail('runtime compatibility key')
    if (!Array.isArray(runtime.samples) || !Array.isArray(runtime.drags))
      fail('runtime arrays')
    if (!runtime.samples.length || !runtime.environment?.browser)
      fail('empty runtime/environment')
    if (
      !finite(runtime.environment.viewport?.width) ||
      !finite(runtime.environment.viewport?.height)
    )
      fail('runtime viewport')
    const expectedSamples = runtime.environment.samplesPerCase
    if (!Number.isInteger(expectedSamples) || expectedSamples < 1)
      fail('runtime sample count')
    const identities = new Set()
    for (const sample of runtime.samples) {
      const identity = `${sample.tabs}:${sample.iteration}`
      if (
        !Number.isInteger(sample.tabs) ||
        sample.tabs < 1 ||
        !Number.isInteger(sample.iteration) ||
        sample.iteration < 0 ||
        sample.iteration >= expectedSamples ||
        identities.has(identity)
      )
        fail('runtime workload/sample identity')
      identities.add(identity)
      if (
        sample.startup?.tabCount !== sample.tabs + 12 ||
        sample.startup.windowCount !== 2 ||
        sample.startup.build?.revision !== record.source.commit ||
        !finite(sample.startup.readyMs) ||
        sample.startup.readyMs === 0 ||
        !finite(sample.heap?.usedSize) ||
        sample.search?.Needle?.matchedTabs !==
          Math.ceil(sample.tabs / 20) + 1 ||
        sample.search?.Work?.matchedTabs !==
          sample.tabs - Math.ceil(sample.tabs / 20) + 11
      )
        fail('runtime fixture/counts')
      for (const query of ['Needle', 'Work'])
        for (const key of ['searchPaintMs', 'searchWorkspaceMs'])
          if (
            !finite(sample.search[query][key]) ||
            sample.search[query][key] === 0 ||
            sample.search[query].effectiveQuery !== query
          )
            fail('unfinished search measurement')
    }
    for (const tabs of new Set(runtime.samples.map((sample) => sample.tabs)))
      if (
        runtime.samples.filter((sample) => sample.tabs === tabs).length !==
        expectedSamples
      )
        fail('partial runtime workload')
    if (
      Array.isArray(runtime.environment.sourceTabs) &&
      runtime.environment.sourceTabs.some(
        (tabs) => !runtime.samples.some((sample) => sample.tabs === tabs),
      )
    )
      fail('missing runtime workload')
    if (
      Number.isInteger(runtime.environment.dragSamples) &&
      runtime.drags.length !== runtime.environment.dragSamples
    )
      fail('partial drag workload')
    for (const drag of runtime.drags) {
      if (
        drag.after?.tabCount !== 1012 ||
        drag.after.windowCount !== 1 ||
        drag.after.dragging !== false ||
        !finite(drag.after.dragRenderMs) ||
        drag.errors?.length ||
        !finite(drag.heap?.usedSize) ||
        drag.scroll?.state?.tabCount !== 1012 ||
        drag.scroll.state.windowCount !== 2 ||
        !finite(drag.scroll.afterHeap?.usedSize)
      )
        fail('incomplete drag/scroll workload')
    }
    if (!Array.isArray(runtime.errors) || runtime.errors.length)
      fail('browser page errors')
    summarizeRuntime(runtime)
  }
  if (!record.bundles.length && !record.runtime) fail('no measurements')
  return record
}

export async function readRecords(inputs = [archiveDirectory]) {
  const byId = new Map()
  const visit = async (path) => {
    if (path.endsWith('.json')) {
      const record = validateRecord(JSON.parse(await readFile(path, 'utf8')))
      if (byId.has(record.id) && json(byId.get(record.id)) !== json(record))
        throw new Error(`Conflicting immutable record: ${record.id}`)
      byId.set(record.id, record)
    } else {
      const files = await readdir(path, { withFileTypes: true })
      for (const file of files
        .filter((file) => file.isFile() && file.name.endsWith('.json'))
        .sort((a, b) => a.name.localeCompare(b.name)))
        await visit(join(path, file.name))
    }
  }
  for (const input of inputs) await visit(resolve(input))
  return [...byId.values()].sort(
    (a, b) =>
      a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id),
  )
}

export async function writeRecord(record, directory) {
  validateRecord(record)
  await mkdir(directory, { recursive: true })
  const path = join(directory, `${record.id}.json`)
  const content = json(record)
  try {
    await writeFile(path, content, { flag: 'wx' })
  } catch (error) {
    if (
      error.code !== 'EEXIST' ||
      json(JSON.parse(await readFile(path, 'utf8'))) !== content
    )
      throw new Error(`Refusing to overwrite performance record: ${path}`, {
        cause: error,
      })
  }
  return path
}

export async function fileHash(path) {
  return sha256(await readFile(path))
}

export async function writeText(path, content) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}
