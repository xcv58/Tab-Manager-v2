import {
  cpus,
  totalmem,
  platform,
  arch,
  loadavg,
  freemem,
  tmpdir,
} from 'node:os'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { readFile, open, unlink } from 'node:fs/promises'
import { repositoryRoot, json, sha256 } from './records.mjs'

export function assertLocalMeasurement(env = process.env) {
  if (
    (env.CI && env.CI !== 'false') ||
    env.GITHUB_ACTIONS === 'true' ||
    env.GITHUB_RUN_ID ||
    env.RUNNER_ENVIRONMENT
  )
    throw new Error(
      'Performance measurements are local-only; CI validates and archives reviewed captures.',
    )
}

export async function withMeasurementLock(
  action,
  path = join(tmpdir(), 'tab-manager-v2-performance.lock'),
) {
  const token = randomUUID()
  let handle
  try {
    handle = await open(path, 'wx')
  } catch (error) {
    if (error.code === 'EEXIST')
      throw new Error(
        'Another local performance capture owns the measurement lock. Check its process before recovering a stale lock.',
      )
    throw error
  }
  let result, actionError
  try {
    await handle.writeFile(
      json({ pid: process.pid, token, startedAt: new Date().toISOString() }),
    )
    result = await action()
  } catch (error) {
    actionError = error
  }
  try {
    await handle.close()
    try {
      if (JSON.parse(await readFile(path, 'utf8')).token === token)
        await unlink(path)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  } catch (error) {
    if (!actionError) throw error
  }
  if (actionError) throw actionError
  return result
}

export function hostIdentity() {
  const require = createRequire(import.meta.url)
  return {
    node: process.version,
    platform: platform(),
    arch: arch(),
    playwright: require(
      join(
        repositoryRoot,
        'packages/integration_test/node_modules/playwright/package.json',
      ),
    ).version,
    hardware: {
      cpuModels: [...new Set(cpus().map((cpu) => cpu.model))].sort(),
      logicalCores: cpus().length,
      memoryBytes: totalmem(),
    },
  }
}

export function validateProfile(profile) {
  if (
    profile?.schemaVersion !== 1 ||
    !/^[a-zA-Z0-9][\w.-]{0,79}$/.test(profile.id || '') ||
    !/^[a-zA-Z0-9][\w.-]{0,79}$/.test(profile.machineId || '') ||
    !/^v\d+\.\d+\.\d+$/.test(profile.node || '') ||
    !/^\d+\.\d+\.\d+$/.test(profile.playwright || '') ||
    !['darwin', 'linux', 'win32'].includes(profile.platform) ||
    !['arm64', 'x64'].includes(profile.arch) ||
    !Array.isArray(profile.hardware?.cpuModels) ||
    !profile.hardware.cpuModels.length ||
    profile.hardware.cpuModels.some(
      (model) => typeof model !== 'string' || !model || model.length > 160,
    ) ||
    !Number.isSafeInteger(profile.hardware.logicalCores) ||
    profile.hardware.logicalCores < 1 ||
    !Number.isSafeInteger(profile.hardware.memoryBytes) ||
    profile.hardware.memoryBytes < 1 ||
    typeof profile.requireACPower !== 'boolean' ||
    !Array.isArray(profile.tabs) ||
    !profile.tabs.length ||
    new Set(profile.tabs).size !== profile.tabs.length ||
    profile.tabs.some(
      (tabs) => !Number.isInteger(tabs) || tabs < 1 || tabs > 5000,
    ) ||
    !Number.isInteger(profile.samples) ||
    profile.samples < 3 ||
    profile.samples > 20 ||
    !Number.isInteger(profile.dragSamples) ||
    profile.dragSamples < 1 ||
    profile.dragSamples > 10 ||
    !/^[a-f0-9]{40}$/.test(profile.reference || '')
  )
    throw new Error('Invalid local performance protocol')
  return profile
}

export function assertProfileHost(profile, host = hostIdentity()) {
  validateProfile(profile)
  for (const key of ['node', 'platform', 'arch', 'playwright', 'hardware'])
    if (json(profile[key]) !== json(host[key]))
      throw new Error(
        `Local performance ${key} differs from ${profile.id}; review a new protocol before measuring on this environment.`,
      )
}

export async function readProfile() {
  return validateProfile(
    JSON.parse(
      await readFile(
        join(repositoryRoot, 'notes/performance/protocol.json'),
        'utf8',
      ),
    ),
  )
}

export function measurementConditions(profile) {
  assertLocalMeasurement()
  let acPower = null
  if (profile.requireACPower) {
    if (platform() !== 'darwin')
      throw new Error('AC power verification for this protocol requires macOS')
    const power = execFileSync('pmset', ['-g', 'batt'], { encoding: 'utf8' })
    acPower = /Now drawing from 'AC Power'/.test(power)
    if (!acPower)
      throw new Error('Connect the benchmark Mac to AC power before measuring.')
  }
  return {
    recordedAt: new Date().toISOString(),
    acPower,
    loadAverage: loadavg(),
    freeMemoryBytes: freemem(),
  }
}

export function profileIdentity(profile) {
  return {
    machineId: profile.machineId,
    protocolId: profile.id,
    protocolSha256: sha256(json(profile)),
  }
}
