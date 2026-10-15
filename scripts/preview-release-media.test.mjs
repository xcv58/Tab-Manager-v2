/* global fetch */
import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startMediaPreview } from './preview-release-media.mjs'

test('the media preview serves exact byte ranges, suffixes, and HEAD requests', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tmv2-preview-test-'))
  await writeFile(join(root, 'clip.mp4'), '0123456789')
  const server = await startMediaPreview(root)
  const url = `http://127.0.0.1:${server.address().port}/clip.mp4`
  try {
    for (const [range, body, contentRange] of [
      ['bytes=2-5', '2345', 'bytes 2-5/10'],
      ['bytes=7-', '789', 'bytes 7-9/10'],
      ['bytes=-3', '789', 'bytes 7-9/10'],
    ]) {
      const response = await fetch(url, { headers: { Range: range } })
      assert.equal(response.status, 206)
      assert.equal(response.headers.get('content-range'), contentRange)
      assert.equal(response.headers.get('content-length'), String(body.length))
      assert.equal(await response.text(), body)
    }
    const head = await fetch(url, { method: 'HEAD' })
    assert.equal(head.headers.get('accept-ranges'), 'bytes')
    assert.equal(head.headers.get('content-type'), 'video/mp4')
    assert.equal(head.headers.get('content-length'), '10')
    assert.equal(await head.text(), '')
    assert.equal(
      (await fetch(url, { headers: { Range: 'bytes=50-' } })).status,
      416,
    )
    assert.equal(await (await fetch(url)).text(), '0123456789')
  } finally {
    server.closeAllConnections()
    await new Promise((done) => server.close(done))
    await rm(root, { recursive: true })
  }
})
