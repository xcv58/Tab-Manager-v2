import { createServer, Server } from 'http'
import type { AddressInfo } from 'net'

export type GroupedBenchmarkWorkload = {
  name: string
  windowCount: number
  tabsPerWindow: number
  groupSize: number
  matchEvery: number
}

export type BenchmarkFixtureServer = {
  baseUrl: string
  close: () => Promise<void>
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export const startBenchmarkFixtureServer =
  async (): Promise<BenchmarkFixtureServer> => {
    const server = await new Promise<Server>((resolve) => {
      const nextServer = createServer((req, res) => {
        const requestUrl = new URL(req.url || '/', 'http://127.0.0.1')
        const title =
          requestUrl.searchParams.get('title') || requestUrl.pathname.slice(1)
        const body =
          requestUrl.searchParams.get('body') ||
          `Benchmark fixture for ${title}`

        res.writeHead(200, {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
        })
        res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(body)}</p>
      <code>${escapeHtml(requestUrl.pathname)}</code>
    </main>
  </body>
</html>`)
      })
      nextServer.listen(0, '127.0.0.1', () => resolve(nextServer))
    })

    const { port } = server.address() as AddressInfo
    return {
      baseUrl: `http://127.0.0.1:${port}`,
      close: () =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error)
              return
            }
            resolve()
          })
        }),
    }
  }

export const getExpectedGroupedMatchCount = (
  workload: GroupedBenchmarkWorkload,
) =>
  workload.windowCount * Math.ceil(workload.tabsPerWindow / workload.matchEvery)

export const getExpectedGroupedRowCount = (
  workload: GroupedBenchmarkWorkload,
) => workload.windowCount * workload.tabsPerWindow

export const getExpectedGroupedHeaderCount = (
  workload: GroupedBenchmarkWorkload,
) => workload.windowCount * (workload.tabsPerWindow / workload.groupSize)

export const buildGroupedBenchmarkWindowUrls = (
  baseUrl: string,
  workload: GroupedBenchmarkWorkload,
) =>
  Array.from({ length: workload.windowCount }, (_, windowIndex) =>
    Array.from({ length: workload.tabsPerWindow }, (_, tabIndex) => {
      const isMatch = tabIndex % workload.matchEvery === 0
      const slug = isMatch ? 'needle-target' : 'baseline'
      const titlePrefix = isMatch ? 'needle-target' : 'baseline'
      const title = `${titlePrefix} window-${windowIndex} tab-${tabIndex}`
      return `${baseUrl}/workspace/${workload.name}/window-${windowIndex}/tab-${tabIndex}/${slug}?title=${encodeURIComponent(
        title,
      )}&body=${encodeURIComponent(
        `Grouped benchmark ${workload.name} window ${windowIndex} tab ${tabIndex}`,
      )}`
    }),
  )
