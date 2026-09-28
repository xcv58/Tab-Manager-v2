#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const API_ROOT = 'https://addons.mozilla.org/api/v5/addons/addon/tab-manager-v2/'
const EXPECTED_ADDON_ID = 1485563
const SCREENSHOT_DIR = fileURLToPath(
  new URL('../docs/assets/images/release-candidates/png/', import.meta.url),
)
const SCREENSHOTS = [
  {
    file: '01-overview-groups-light.png',
    sha256: '7671aedd191131bbb16d1d3bce887ad7cb93fb97803e3e27369aa727a54ca1cc',
    caption: 'See tabs and groups across all your Firefox windows in one place.',
  },
  {
    file: '03-search-groups-light.png',
    sha256: 'ebfffce568d6cffa9290bd81563d8f2c4fffe213a5cb79200f8f0b36dfda5335',
    caption: 'Find open tabs quickly by title or URL.',
  },
  {
    file: '06-grouped-tabs-focus-light.png',
    sha256: '14d8f44f65c991c86596d08b3921b297297c103ebb89311cd74164a046fef7f0',
    caption: 'Select tabs together and organize native tab groups.',
  },
  {
    file: '07-settings-light.png',
    sha256: 'fca499e85c2c1c429bcd06dd69ae92e370a2cbb89c37216d1ab3fa94abb27443',
    caption: 'Tune search, appearance, and window layout to fit your workflow.',
  },
]

const apiKey = process.env.WEB_EXT_API_KEY
const apiSecret = process.env.WEB_EXT_API_SECRET
if (!apiKey || !apiSecret) {
  throw new Error('Missing WEB_EXT_API_KEY or WEB_EXT_API_SECRET')
}

const base64url = (value) => Buffer.from(value).toString('base64url')
const authorization = async () => {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({ iss: apiKey, jti: randomUUID(), iat: now, exp: now + 60 }),
  )
  const signed = `${header}.${payload}`
  const signingKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = Buffer.from(
    await crypto.subtle.sign('HMAC', signingKey, new TextEncoder().encode(signed)),
  ).toString('base64url')
  return `JWT ${signed}.${signature}`
}

async function request(path, options = {}) {
  const response = await fetch(new URL(path, API_ROOT), {
    ...options,
    headers: { Authorization: await authorization(), ...options.headers },
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(`AMO ${options.method || 'GET'} ${path}: ${response.status} ${JSON.stringify(body)}`)
  }
  return body
}

async function main() {
  const images = await Promise.all(
    SCREENSHOTS.map(async (item) => {
      const data = await readFile(resolve(SCREENSHOT_DIR, item.file))
      const digest = createHash('sha256').update(data).digest('hex')
      if (digest !== item.sha256) {
        throw new Error(`Screenshot changed since review: ${item.file}`)
      }
      if (data.readUInt32BE(16) !== 1280 || data.readUInt32BE(20) !== 800) {
        throw new Error(`Screenshot must be 1280x800: ${item.file}`)
      }
      return data
    }),
  )

  const addon = await request('')
  if (addon.id !== EXPECTED_ADDON_ID) {
    throw new Error(`Unexpected AMO add-on ID: ${addon.id}`)
  }
  if (!Array.isArray(addon.previews) || addon.previews.length !== 0) {
    throw new Error('AMO gallery is no longer empty; review it before uploading')
  }

  for (const [index, item] of SCREENSHOTS.entries()) {
    const form = new FormData()
    form.append('image', new Blob([images[index]], { type: 'image/png' }), item.file)
    const preview = await request('previews/', { method: 'POST', body: form })
    if (!Number.isInteger(preview.id)) {
      throw new Error(`AMO did not return an ID for ${item.file}`)
    }
    await request(`previews/${preview.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: { 'en-US': item.caption },
        position: index + 1,
      }),
    })
    console.log(`Uploaded ${index + 1}/${SCREENSHOTS.length}: ${item.file}`)
  }

  const updated = await request('')
  if (updated.previews?.length !== SCREENSHOTS.length) {
    throw new Error(`Expected ${SCREENSHOTS.length} previews; found ${updated.previews?.length}`)
  }
  console.log(`AMO gallery contains ${updated.previews.length} screenshots`)
}

await main()
