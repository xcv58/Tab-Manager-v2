import { URL } from 'node:url'
import assert from 'node:assert/strict'
import { request } from 'node:http'
import test from 'node:test'
import { SAMPLE_SITES, sampleUrl, startCaptureSites } from './capture-sites.mjs'

const get = (port, path) =>
  new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path }, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        body += chunk
      })
      response.on('end', () =>
        resolve({
          status: response.statusCode,
          body,
          headers: response.headers,
        }),
      )
    })
    req.on('error', reject)
    req.end()
  })

test('capture pages and icons work locally while unknown destinations stay blocked', async () => {
  const sites = await startCaptureSites()
  try {
    for (const site of Object.values(SAMPLE_SITES)) {
      const page = await get(sites.port, site.url)
      assert.equal(page.status, 200, site.url)
      assert.ok(page.body.includes(`<title>${site.title}</title>`), site.url)
      assert.ok(page.body.includes('Fictional sample website'))
      const icon = await get(
        sites.port,
        `${new URL(site.url).origin}/favicon.svg`,
      )
      assert.equal(icon.status, 200)
      assert.equal(icon.headers['content-type'], 'image/svg+xml')
      const png = await get(
        sites.port,
        `${new URL(site.url).origin}/favicon.png`,
      )
      assert.equal(png.status, 200)
      assert.equal(png.headers['content-type'], 'image/png')
    }
    for (const url of [
      'http://external.invalid/',
      'http://notes.example.test/missing',
      'https://notes.example.test/project',
    ]) {
      assert.equal((await get(sites.port, url)).status, 403)
    }
    assert.equal(
      sites.provenance().servedPages.length,
      Object.keys(SAMPLE_SITES).length,
    )
    assert.equal(sites.provenance().blockedRequests, 3)
    assert.throws(() => sampleUrl('missing'), /Unknown capture site/)
  } finally {
    await sites.close()
  }
})

test('the capture proxy refuses HTTPS tunnels', async () => {
  const sites = await startCaptureSites()
  try {
    const status = await new Promise((resolve, reject) => {
      const req = request({
        host: '127.0.0.1',
        port: sites.port,
        method: 'CONNECT',
        path: 'external.invalid:443',
      })
      req.on('connect', (response, socket) => {
        socket.destroy()
        resolve(response.statusCode)
      })
      req.on('error', reject)
      req.end()
    })
    assert.equal(status, 403)
  } finally {
    await sites.close()
  }
})
