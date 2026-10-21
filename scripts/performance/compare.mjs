/* global document */
import { URL } from 'node:url'
import console from 'node:console'
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import { arch, platform, release, cpus, totalmem } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  repositoryRoot,
  git,
  sha256,
  fileHash,
  json,
  readRecords,
  writeRecord,
  writeText,
} from './records.mjs'
import { recordReport, buildViewer } from './reports.mjs'
import { startMediaPreview } from '../preview-release-media.mjs'

const require = createRequire(import.meta.url)
const integer = (value, min, max, name) => {
  const number = Number(value)
  if (!Number.isInteger(number) || number < min || number > max)
    throw new Error(`Invalid ${name}`)
  return number
}
const readMetrics = (page) =>
  page.locator('#profile-metrics').textContent().then(JSON.parse)
const waitReady = (page) =>
  page.waitForFunction(
    () => {
      try {
        const value = JSON.parse(
          document.querySelector('#profile-metrics').textContent,
        )
        return (
          value.readyMs > 0 && value.mountedRows > 0 && value.fixtureFingerprint
        )
      } catch {
        return false
      }
    },
    null,
    { timeout: 30000 },
  )

export async function compareRevisions(options) {
  const samples = integer(options.samples, 1, 20, 'sample count')
  const dragSamples = integer(
    options['drag-samples'],
    0,
    10,
    'drag sample count',
  )
  const tabs = [
    ...new Set(
      options.tabs
        .split(',')
        .map((value) => integer(value, 1, 5000, 'tab count')),
    ),
  ].sort((a, b) => a - b)
  const candidates = (
    options.revisions ? options.revisions.split(',') : [options.head]
  ).map((ref) => git(['rev-parse', '--verify', `${ref}^{commit}`]))
  const commits = [
    ...new Set([options.baseCommit, options.referenceCommit, ...candidates]),
  ]
  if (commits.length < 2 || commits.length > 30)
    throw new Error('Expected 2–30 distinct frozen revisions')
  const id =
    options.id || `runtime-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`
  if (!/^[\w.-]{1,130}$/.test(id)) throw new Error('Invalid run id')
  await mkdir(join(repositoryRoot, '.tmp'), { recursive: true })
  const workspace = await mkdtemp(
    join(repositoryRoot, '.tmp/performance-work-'),
  )
  const { chromium } = require(
    join(repositoryRoot, 'packages/integration_test/node_modules/playwright'),
  )
  const archived = await readRecords()
  const revisions = []
  let browser,
    server,
    complete = false
  const errors = []
  const fixtureFingerprints = {}
  try {
    for (const commit of commits) {
      const key = commit.slice(0, 8)
      const source = join(workspace, key)
      await mkdir(source)
      const tar = join(workspace, `${key}.tar`)
      execFileSync(
        'git',
        ['archive', '--format=tar', '--output', tar, commit],
        { cwd: repositoryRoot },
      )
      execFileSync('tar', ['-xf', tar, '-C', source])
      console.log(`Installing frozen ${key}: ${commit}`)
      execFileSync(
        'pnpm',
        ['install', '--frozen-lockfile', '--ignore-scripts'],
        { cwd: source, stdio: 'inherit' },
      )
      const profile = join(workspace, `profile-${key}`)
      execFileSync(
        process.execPath,
        [join(repositoryRoot, 'packages/extension/utils/profile.js')],
        {
          cwd: repositoryRoot,
          stdio: 'inherit',
          env: {
            ...process.env,
            NODE_ENV: 'production',
            TARGET_BROWSER: 'chrome',
            PROFILE_SOURCE_ROOT: join(source, 'packages/extension'),
            PROFILE_OUTPUT: profile,
            PROFILE_REVISION: commit,
          },
        },
      )
      const pkg = JSON.parse(
        await readFile(join(source, 'packages/extension/package.json'), 'utf8'),
      )
      const prior = archived
        .filter((record) => record.source.commit === commit)
        .at(-1)
      let tag = null
      try {
        tag = git([
          'describe',
          '--tags',
          '--exact-match',
          '--match',
          'v[0-9]*',
          commit,
        ])
      } catch {
        /* Manual release baseline has no tag. */
      }
      const status =
        tag || prior?.source.status === 'released' ? 'released' : 'candidate'
      const profileFiles = []
      for (const file of (await readdir(profile)).sort())
        profileFiles.push({ file, sha256: await fileHash(join(profile, file)) })
      revisions.push({
        key,
        commit,
        profile,
        source,
        pkg,
        samples: [],
        drags: [],
        profileFiles,
        metadata: {
          commit,
          committedAt: git(['show', '-s', '--format=%cI', commit]),
          version: pkg.version,
          label:
            status === 'released'
              ? pkg.version
              : `${pkg.version} candidate @ ${commit.slice(0, 8)}`,
          status,
          tag,
          dirty: false,
        },
      })
    }
    const flags = [
      '--enable-precise-memory-info',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
    ]
    browser = await chromium.launch({
      headless: true,
      ...(options.executable ? { executablePath: options.executable } : {}),
      args: flags,
    })
    const environment = {
      node: process.version,
      platform: platform(),
      arch: arch(),
      osVersion: release(),
      hardware: {
        cpuModels: [...new Set(cpus().map((cpu) => cpu.model))].sort(),
        logicalCores: cpus().length,
        memoryBytes: totalmem(),
        runnerImage: process.env.ImageOS || null,
        runnerImageVersion: process.env.ImageVersion || null,
      },
      browser: browser.version(),
      browserEngine: 'chromium',
      runner: process.env.RUNNER_ENVIRONMENT
        ? `${process.env.RUNNER_ENVIRONMENT}:${process.env.RUNNER_OS}:${process.env.RUNNER_ARCH}`
        : `local:${platform()}:${arch()}`,
      viewport: { width: 2320, height: 989 },
      headless: true,
      flags,
      externalRequests: 'blocked',
      httpCache: 'disabled by request routing',
      profiling: true,
      samplesPerCase: samples,
      dragSamples,
      sourceTabs: tabs,
      referenceCommit: options.referenceCommit,
    }
    server = await startMediaPreview(workspace, 0)
    const baseUrl = `http://127.0.0.1:${server.address().port}`
    for (const revision of revisions) {
      revision.context = await browser.newContext({
        viewport: environment.viewport,
        serviceWorkers: 'block',
      })
      await revision.context.route('**/*', (route) =>
        new URL(route.request().url()).origin === baseUrl
          ? route.continue()
          : route.abort(),
      )
    }
    const pageFor = async (revision, count) => {
      const page = await revision.context.newPage()
      page.on('pageerror', (error) =>
        errors.push({ revision: revision.key, message: error.message }),
      )
      await page.goto(
        `${baseUrl}/profile-${revision.key}/index.html?not_popup=1#scenario=single-window&tabs=${count}&grouped=1`,
        { waitUntil: 'load' },
      )
      await waitReady(page)
      const state = await readMetrics(page)
      if (
        state.build.revision !== revision.commit ||
        state.tabCount !== count + 12
      )
        throw new Error('Wrong source revision or fixture')
      if (
        fixtureFingerprints[count] &&
        fixtureFingerprints[count] !== state.fixtureFingerprint
      )
        throw new Error(`Concrete fixture metadata differs for ${count} tabs`)
      fixtureFingerprints[count] = state.fixtureFingerprint
      return page
    }
    const run = async (revision, count, iteration, warmup = false) => {
      const page = await pageFor(revision, count)
      await page.waitForTimeout(250)
      const startup = await readMetrics(page)
      const cdp = await revision.context.newCDPSession(page)
      await cdp.send('HeapProfiler.collectGarbage')
      const heap = await cdp.send('Runtime.getHeapUsage')
      const search = {}
      const input = page.getByPlaceholder('Search tabs or URLs')
      for (const query of ['Needle', 'Work']) {
        await page.locator('#reset-metrics').click()
        await input.fill(query)
        await page.waitForFunction((query) => {
          const value = JSON.parse(
            document.querySelector('#profile-metrics').textContent,
          )
          return value.effectiveQuery === query && value.searchWorkspaceMs > 0
        }, query)
        search[query] = await readMetrics(page)
        await input.fill('')
        await page.waitForFunction(
          () =>
            JSON.parse(document.querySelector('#profile-metrics').textContent)
              .effectiveQuery === '',
        )
        await page.waitForTimeout(250)
      }
      if (!warmup) {
        revision.samples.push({ iteration, tabs: count, startup, heap, search })
        console.log(
          `${revision.key} ${count} tabs, sample ${iteration + 1}/${samples}: ${startup.readyMs.toFixed(1)} ms startup`,
        )
      }
      await cdp.detach()
      await page.close()
    }
    for (const count of tabs) {
      for (const revision of revisions) await run(revision, count, -1, true)
      for (let iteration = 0; iteration < samples; iteration++)
        for (const revision of iteration % 2
          ? [...revisions].reverse()
          : revisions)
          await run(revision, count, iteration)
    }
    for (let iteration = 0; iteration < dragSamples; iteration++)
      for (const revision of iteration % 2
        ? [...revisions].reverse()
        : revisions) {
        const page = await pageFor(revision, 1000)
        const cdp = await revision.context.newCDPSession(page)
        await cdp.send('HeapProfiler.collectGarbage')
        const beforeHeap = await cdp.send('Runtime.getHeapUsage')
        const scroller = page.getByTestId('window-list-scroll-container')
        for (let step = 0; step < 8; step++) {
          await scroller.evaluate((node) => {
            node.scrollTop += node.clientHeight
          })
          await page.waitForTimeout(100)
        }
        const position = await scroller.evaluate((node) => ({
          scrollTop: node.scrollTop,
          clientHeight: node.clientHeight,
        }))
        await page.locator('#inspect-references').click()
        const scrolled = await readMetrics(page)
        if (Math.abs(position.scrollTop - 8 * position.clientHeight) > 8)
          throw new Error('Scroll workload did not complete')
        await cdp.send('HeapProfiler.collectGarbage')
        const afterHeap = await cdp.send('Runtime.getHeapUsage')
        await page.reload()
        await waitReady(page)
        await page.getByTestId('tab-group-header-101').hover()
        const origin = await page
          .getByTestId('tab-group-drag-handle-101')
          .boundingBox()
        const target = await page.getByTestId('tab-row-1008').boundingBox()
        if (!origin || !target)
          throw new Error('Group drag targets not mounted')
        await page.locator('#reset-metrics').click()
        const x = origin.x + origin.width / 2,
          y = origin.y + origin.height / 2
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.mouse.move(x + 15, y + 10, { steps: 4 })
        await page.mouse.move(target.x + 20, target.y + target.height * 0.75, {
          steps: 20,
        })
        await page.waitForTimeout(300)
        const during = await readMetrics(page)
        await page.mouse.up()
        await page.waitForFunction(
          () => {
            const value = JSON.parse(
              document.querySelector('#profile-metrics').textContent,
            )
            return value.windowCount === 1 && !value.dragging
          },
          null,
          { timeout: 15000 },
        )
        await page.waitForTimeout(400)
        const after = await readMetrics(page)
        await page.locator('#inspect-references').click()
        const references = (await readMetrics(page)).retainedReferences
        await cdp.send('HeapProfiler.collectGarbage')
        const heap = await cdp.send('Runtime.getHeapUsage')
        revision.drags.push({
          iteration,
          scroll: { position, beforeHeap, afterHeap, state: scrolled },
          during,
          after,
          references,
          heap,
          errors: [],
        })
        console.log(
          `${revision.key} group drag ${iteration + 1}/${dragSamples}: ${after.dragMaxRows} peak rows`,
        )
        await cdp.detach()
        await page.close()
      }
    if (errors.length)
      throw new Error('Profiling pages reported runtime errors')
    const harnessFiles = [
      'scripts/performance/compare.mjs',
      'packages/extension/utils/profile.js',
      'packages/integration_test/assets/profiling/entry.tsx',
      'packages/integration_test/assets/profiling/fixtures.ts',
      'packages/integration_test/assets/profiling/index.html',
      'packages/extension/src/js/demo/browser.ts',
      'packages/extension/src/js/demo/fixtures.ts',
      'packages/extension/src/js/demo/preferences.ts',
      'packages/extension/src/js/demo/scenarios.ts',
      'packages/integration_test/assets/profiling/settings-preview.ts',
      'packages/extension/src/js/libs/tabTooltip.ts',
    ]
    const harness = []
    for (const file of harnessFiles)
      harness.push({ file, sha256: await fileHash(join(repositoryRoot, file)) })
    const compatibilityKey = sha256(
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
    const records = []
    for (const revision of revisions) {
      const record = {
        schemaVersion: 1,
        id: `${id}-${revision.commit.slice(0, 8)}`,
        recordedAt: new Date().toISOString(),
        source: revision.metadata,
        provenance: {
          kind: options.revisions
            ? 'release-runtime-backfill'
            : 'matched-runtime-comparison',
          note: options.revisions
            ? 'Frozen historical release UI and stores re-measured at recordedAt with a common simulated browser adapter. These are present-day measurements, not timings recorded when the versions were released.'
            : undefined,
          repository: 'xcv58/Tab-Manager-v2',
          runner: environment.runner,
          lockfileSha256: await fileHash(
            join(revision.source, 'pnpm-lock.yaml'),
          ),
          harness,
          profileFiles: revision.profileFiles,
          workflowRun: process.env.GITHUB_RUN_ID || null,
        },
        bundles: [],
        runtime: {
          compatibilityKey,
          environment,
          fixtureFingerprints,
          samples: revision.samples,
          drags: revision.drags,
          errors: [],
        },
        comparisonBaseline: {
          commit: options.baseCommit,
          referenceCommit: options.referenceCommit,
        },
        retrospective: Boolean(options.revisions),
      }
      await writeRecord(record, join(options.output, 'runs'))
      await writeText(
        join(options.output, `${record.id}.md`),
        recordReport(record),
      )
      records.push(record)
    }
    await buildViewer([...archived, ...records], join(options.output, 'viewer'))
    complete = true
    console.log(`Runtime records: ${join(options.output, 'runs')}`)
  } finally {
    if (browser) await browser.close()
    if (server) await new Promise((done) => server.close(done))
    if (complete) await rm(workspace, { recursive: true, force: true })
    else {
      await mkdir(options.output, { recursive: true })
      await writeFile(
        join(options.output, `${id}-diagnostics.json`),
        json({
          errors,
          workspace,
          partial: revisions.map(({ key, commit, samples, drags }) => ({
            key,
            commit,
            samples,
            drags,
          })),
        }),
      )
      console.log(
        `Incomplete capture retained at ${workspace}; no partial record was archived.`,
      )
    }
  }
}
