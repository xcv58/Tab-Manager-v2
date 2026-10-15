import { URL } from 'node:url'
// Capture-only forward proxy. Fictional .test sites never contact the internet;
// the extension still reads titles, favicons and URLs from actual browser tabs.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const SAMPLE_SITES = JSON.parse(
  readFileSync(
    new URL('../assets/capture-sites/catalog.json', import.meta.url),
  ),
)
const byUrl = new Map(
  Object.values(SAMPLE_SITES).map((site) => [site.url, site]),
)
if (byUrl.size !== Object.keys(SAMPLE_SITES).length)
  throw new Error('Duplicate capture site URL')

export const sampleUrl = (key) => {
  if (!SAMPLE_SITES[key]) throw new Error(`Unknown capture site: ${key}`)
  return SAMPLE_SITES[key].url
}

const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ],
  )

const colors = [
  '#2563eb',
  '#087f8c',
  '#7c3aed',
  '#c2410c',
  '#15803d',
  '#be185d',
]
const hosts = [
  ...new Set(Object.values(SAMPLE_SITES).map((site) => new URL(site.url).host)),
]
export const captureIconSvg = (host) => {
  const color = colors[hosts.indexOf(host) % colors.length]
  const letter = host[0].toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${color}"/><text x="32" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-size="40" font-weight="700" fill="white">${letter}</text></svg>`
}

export async function startCaptureSites() {
  const servedPages = new Set()
  let blockedRequests = 0
  const server = createServer((request, response) => {
    let url
    try {
      url = new URL(request.url, `http://${request.headers.host}`)
    } catch {
      response.writeHead(400).end()
      return
    }
    const site = byUrl.get(`${url.origin}${url.pathname}`)
    const isIcon =
      hosts.includes(url.host) &&
      ['/favicon.svg', '/favicon.png'].includes(url.pathname)
    if (
      url.protocol !== 'http:' ||
      !['GET', 'HEAD'].includes(request.method) ||
      (!site && !isIcon)
    ) {
      blockedRequests++
      response
        .writeHead(403)
        .end('Capture profile: external requests are blocked.')
      return
    }
    const pngIcon = isIcon && url.pathname.endsWith('.png')
    const body = isIcon
      ? pngIcon
        ? readFileSync(
            new URL(
              `../assets/capture-sites/icons/${url.hostname}.png`,
              import.meta.url,
            ),
          )
        : captureIconSvg(url.host)
      : `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(site.title)}</title><link rel="icon" type="image/png" href="/favicon.png"><style>body{margin:0;background:#f4f6fb;color:#172033;font:18px/1.6 system-ui,sans-serif}main{max-width:760px;margin:10vh auto;padding:40px;background:white;border-radius:16px}small{color:#59677e}h1{font-size:36px;line-height:1.2}li{margin:12px 0}</style><main><small>Sample workspace</small><h1>${escape(site.title)}</h1><p>A clear place to keep ideas, plans and useful references together.</p><ul><li>Review the latest notes</li><li>Keep the next steps in view</li><li>Return whenever you need them</li></ul><small>Fictional sample website, served locally for product demonstrations.</small></main></html>`
    if (site) servedPages.add(site.url)
    response.writeHead(200, {
      'Content-Type': isIcon
        ? pngIcon
          ? 'image/png'
          : 'image/svg+xml'
        : 'text/html; charset=utf-8',
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; connect-src 'none'",
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': Buffer.byteLength(body),
    })
    response.end(request.method === 'HEAD' ? undefined : body)
  })
  // Do not tunnel HTTPS or forward any request to another server.
  server.on('connect', (_request, socket) => {
    blockedRequests++
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const port = server.address().port
  return {
    port,
    proxy: { server: `http://127.0.0.1:${port}` },
    provenance: () => ({
      mode: 'local-fictional-sites',
      catalogueSha256: createHash('sha256')
        .update(JSON.stringify(SAMPLE_SITES))
        .digest('hex'),
      servedPages: [...servedPages].sort(),
      blockedRequests,
    }),
    close: () =>
      new Promise((resolve) => {
        server.close(resolve)
        server.closeAllConnections()
      }),
  }
}
