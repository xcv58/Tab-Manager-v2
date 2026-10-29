// Apple JSON:API requests are deliberately single-attempt. Reconcile mutations
// after timeouts instead of blindly repeating POST/PATCH operations.
import { createPrivateKey, sign } from 'node:crypto'
import { URL } from 'node:url'
/* global fetch, AbortSignal */
import { assert } from './github.mjs'
import { safari } from './safari-model.mjs'

export function appleClient() {
  const {
    ASC_KEY_ID: kid,
    ASC_ISSUER_ID: issuer,
    ASC_PRIVATE_KEY: pem,
  } = process.env
  assert(
    kid && issuer && pem,
    'safari-app-store needs ASC_KEY_ID, ASC_ISSUER_ID and ASC_PRIVATE_KEY',
  )
  const key = createPrivateKey(pem)
  async function api(path, method = 'GET', data) {
    const url = new URL(path, 'https://api.appstoreconnect.apple.com')
    assert(
      url.origin === 'https://api.appstoreconnect.apple.com' &&
        url.pathname.startsWith('/v1/'),
      'untrusted Apple API URL',
    )
    const now = Math.floor(Date.now() / 1000)
    const encode = (value) =>
      Buffer.from(JSON.stringify(value)).toString('base64url')
    const payload = `${encode({ alg: 'ES256', kid, typ: 'JWT' })}.${encode({ iss: issuer, iat: now - 5, exp: now + 120, aud: 'appstoreconnect-v1' })}`
    const token = `${payload}.${sign('sha256', Buffer.from(payload), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...(data ? { body: JSON.stringify({ data }) } : {}),
      signal: AbortSignal.timeout(60000),
    })
    if (response.status === 204) return {}
    const result = await response.json()
    if (!response.ok) {
      const error = new Error(
        `Apple ${method} ${url.pathname}: ${response.status} ${JSON.stringify(result.errors?.map(({ code, title, detail }) => ({ code, title, detail })))}`,
      )
      error.status = response.status
      throw error
    }
    return result
  }
  async function list(path) {
    const data = []
    for (let next = path; next; ) {
      const page = await api(next)
      assert(Array.isArray(page.data), 'invalid Apple list response')
      data.push(...page.data)
      next = page.links?.next
    }
    return data
  }
  async function checkApp() {
    const { data } = await api(`/v1/apps/${safari.appId}`)
    assert(
      data.id === safari.appId && data.attributes.bundleId === safari.bundleId,
      'Apple account/app identity differs',
    )
  }
  return { api, list, checkApp }
}

export async function appleBuilds(apple) {
  return apple.list(
    `/v1/builds?filter[app]=${safari.appId}&filter[preReleaseVersion.platform]=MAC_OS&limit=200`,
  )
}
export async function appleUploads(apple) {
  return apple.list(
    `/v1/apps/${safari.appId}/buildUploads?filter[platform]=MAC_OS&limit=200`,
  )
}
export function nextBuildNumber(builds, uploads, allocations) {
  const values = [
    ...builds.map((b) => b.attributes.version),
    ...uploads.map((b) => b.attributes.cfBundleVersion),
    ...allocations.map((a) => a.buildNumber),
  ]
  for (const value of values)
    assert(
      /^[1-9]\d{0,8}$/.test(value),
      `Reconcile non-integer/unsupported Apple build number ${value} before allocating`,
    )
  const next = Math.max(0, ...values.map(Number)) + 1
  assert(next <= 999999999, 'Safari build number exhausted')
  return String(next)
}

export async function matchingAppleBuild(apple, candidate) {
  const matches = await apple.list(
    `/v1/builds?filter[app]=${safari.appId}&filter[preReleaseVersion.platform]=MAC_OS&filter[version]=${candidate.safari.buildNumber}&limit=200`,
  )
  assert(matches.length <= 1, 'ambiguous Apple build number')
  const build = matches[0]
  if (build) {
    const { data: version } = await apple.api(
      `/v1/builds/${build.id}/preReleaseVersion`,
    )
    assert(
      version.attributes.platform === 'MAC_OS' &&
        version.attributes.version === candidate.source.version,
      'Apple build number belongs to another product version',
    )
  }
  return build
}
