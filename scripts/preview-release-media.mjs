// Local-only preview with byte ranges for native and Video.js seeking.
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
import { URL, fileURLToPath } from 'node:url'

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.zip': 'application/zip',
}

export async function startMediaPreview(root, port = 0) {
  root = resolve(root)
  const server = createServer(async (request, response) => {
    try {
      let path = resolve(
        root,
        '.' +
          decodeURIComponent(new URL(request.url, 'http://localhost').pathname),
      )
      if (path !== root && !path.startsWith(root + sep)) {
        response.writeHead(403).end()
        return
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405).end()
        return
      }
      let info = await stat(path)
      if (info.isDirectory()) {
        path = resolve(path, 'index.html')
        info = await stat(path)
      }
      if (!info.isFile()) {
        response.writeHead(404).end()
        return
      }
      let start = 0
      let end = info.size - 1
      if (request.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range)
        if (match && (match[1] || match[2])) {
          if (match[1]) {
            start = Number(match[1])
            end = match[2] ? Math.min(Number(match[2]), end) : end
          } else start = Math.max(0, info.size - Number(match[2]))
        }
        if (
          !match ||
          !(match[1] || match[2]) ||
          start > end ||
          start >= info.size ||
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end)
        ) {
          response
            .writeHead(416, { 'Content-Range': `bytes */${info.size}` })
            .end()
          return
        }
      }
      response.writeHead(request.headers.range ? 206 : 200, {
        'Accept-Ranges': 'bytes',
        'Content-Type': types[extname(path)] || 'application/octet-stream',
        'Content-Length': Math.max(0, end - start + 1),
        'Cache-Control': 'no-store',
        ...(request.headers.range
          ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` }
          : {}),
      })
      if (request.method === 'HEAD' || !info.size) response.end()
      else
        createReadStream(path, { start, end })
          .on('error', () => response.destroy())
          .pipe(response)
    } catch {
      if (!response.headersSent) response.writeHead(404)
      response.end()
    }
  })
  await new Promise((ready, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', ready)
  })
  return server
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const server = await startMediaPreview(
    process.argv[2] || 'dist/site',
    Number(process.argv[3] || 8777),
  )
  process.stdout.write(
    `Local media preview: http://127.0.0.1:${server.address().port}\n`,
  )
}
