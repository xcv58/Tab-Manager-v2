import type { WebsiteIcons } from 'libs/websiteIcons'
import { websiteOriginPattern } from 'libs/tabMonogram'

const MAX_BYTES = 256 * 1024
const MAX_CACHE = 128
const TIMEOUT = 8000

// Lives only in the extension page's memory, not in synced storage or a server.
export const createWebsiteIcons = (raw: any): WebsiteIcons => {
  const cache = new Map<string, { image: string | null; expires: number }>()
  const pending = new Map<string, Promise<string | null>>()
  const listeners = new Set<(tabId?: number) => void>()
  const controllers = new Set<AbortController>()
  let generation = 0
  let active = 0
  const waiting: Array<() => void> = []
  const invalidate = () => {
    generation++
    cache.clear()
    pending.clear()
    controllers.forEach((controller) => controller.abort())
    listeners.forEach((listener) => listener())
  }
  raw.permissions?.onAdded?.addListener(invalidate)
  raw.permissions?.onRemoved?.addListener(invalidate)
  raw.storage.onChanged.addListener((changes: any, area: string) => {
    if (area === 'local' && (changes.loadWebsiteIcons || changes.showTabIcon))
      invalidate()
  })
  raw.tabs.onUpdated?.addListener((id: number, changes: any, tab: any) => {
    // A background tab finishing a load must not cancel every visible icon.
    if (changes.url || changes.status === 'complete') {
      cache.delete(tab?.url || changes.url)
      listeners.forEach((listener) => listener(id))
    }
  })
  const allowed = async (url: string) => {
    const origin = websiteOriginPattern(url)
    return (
      !!origin &&
      (await raw.permissions?.contains({ origins: [origin] })) === true
    )
  }
  const matchingTab = async (id: number, url: string) => {
    const tab = await raw.tabs.get(id)
    return tab && !tab.incognito && tab.id === id && tab.url === url
  }
  const asPng = (
    bytes: Uint8Array<ArrayBuffer>,
    type: string,
    signal: AbortSignal,
  ) =>
    new Promise<string | null>((resolve) => {
      const blobUrl = URL.createObjectURL(new Blob([bytes], { type }))
      const image = new Image()
      const finish = (value: string | null) => {
        signal.removeEventListener('abort', abort)
        image.onload = image.onerror = null
        image.src = ''
        URL.revokeObjectURL(blobUrl)
        resolve(value)
      }
      const abort = () => finish(null)
      signal.addEventListener('abort', abort, { once: true })
      image.onerror = () => finish(null)
      image.onload = () => {
        if (
          signal.aborted ||
          image.naturalWidth > 4096 ||
          image.naturalHeight > 4096 ||
          !image.naturalWidth ||
          !image.naturalHeight
        )
          return finish(null)
        try {
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 32
          const context = canvas.getContext('2d')
          if (!context) return finish(null)
          context.drawImage(image, 0, 0, 32, 32)
          finish(canvas.toDataURL('image/png'))
        } catch {
          finish(null)
        }
      }
      if (signal.aborted) return finish(null)
      image.src = blobUrl
    })
  const fetchIcon = async (url: string, signal: AbortSignal) => {
    // Never follow redirects to another host or send cookies/referrers.
    if (signal.aborted || !(await allowed(url)) || signal.aborted) return null
    const response = await fetch(url, {
      signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'error',
      cache: 'force-cache',
    })
    if (
      !response.ok ||
      Number(response.headers.get('content-length')) > MAX_BYTES
    ) {
      await response.body?.cancel()
      return null
    }
    const type = (response.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase()
    // Keep SVG in the local monogram path; fetched images must be raster data.
    if (
      ![
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
        'image/x-icon',
        'image/vnd.microsoft.icon',
      ].includes(type)
    ) {
      await response.body?.cancel()
      return null
    }
    const reader = response.body?.getReader()
    if (!reader) return null
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAX_BYTES || signal.aborted) return null
        chunks.push(value)
      }
    } finally {
      await reader.cancel().catch(() => {})
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    chunks.forEach((chunk) => {
      bytes.set(chunk, offset)
      offset += chunk.length
    })
    return asPng(bytes, type, signal)
  }
  const load = async (id: number, url: string, signal: AbortSignal) => {
    if (signal.aborted || !(await matchingTab(id, url))) return null
    const settings = await raw.storage.local.get([
      'loadWebsiteIcons',
      'showTabIcon',
    ])
    if (
      settings.loadWebsiteIcons !== true ||
      settings.showTabIcon === false ||
      !(await allowed(url)) ||
      signal.aborted
    )
      return null
    const saved = cache.get(url)
    if (saved && saved.expires > Date.now()) return saved.image
    const results = await raw.tabs.executeScript(id, {
      file: 'read-icon.js',
      runAt: 'document_idle',
      allFrames: false,
    })
    const metadata = results?.[0]
    if (
      signal.aborted ||
      metadata?.url !== url ||
      !(await matchingTab(id, url))
    )
      return null
    const candidates = [
      ...(Array.isArray(metadata.icons) ? metadata.icons.slice(0, 8) : []),
      new URL('/favicon.ico', url).href,
    ]
    let image: string | null = null
    for (const candidate of [...new Set(candidates)]) {
      if (signal.aborted) return null
      if (typeof candidate !== 'string' || !websiteOriginPattern(candidate))
        continue
      // A page cannot use its icon link to probe another private/local network.
      // Cross-origin icons are left as initials; no extra CDN access is requested.
      if (new URL(candidate).origin !== new URL(url).origin) continue
      try {
        image = await fetchIcon(candidate, signal)
      } catch {
        /* Use initials on missing/offline/denied icons. */
      }
      if (image) break
    }
    if (
      signal.aborted ||
      !(await matchingTab(id, url)) ||
      !(await allowed(url))
    )
      return null
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!)
    cache.set(url, {
      image,
      expires: Date.now() + (image ? 30 * 60_000 : 60_000),
    })
    return image
  }
  return {
    // Called directly in the Settings click handler, before any await.
    requestAccess: (urls) => {
      const origins = [
        ...new Set(
          urls
            .map(websiteOriginPattern)
            .filter((value): value is string => !!value),
        ),
      ]
      if (!origins.length || !raw.permissions?.request)
        return Promise.resolve(false)
      return raw.permissions.request({ origins })
    },
    resolve: (id, url) => {
      if (!Number.isInteger(id) || !websiteOriginPattern(url))
        return Promise.resolve(null)
      const key = `${id}:${url}`
      if (pending.has(key)) return pending.get(key)!
      if (waiting.length >= 64) return Promise.resolve(null)
      const startGeneration = generation
      const result = new Promise<string | null>((resolve) => {
        const start = () => {
          if (generation !== startGeneration) {
            resolve(null)
            return
          }
          active++
          const controller = new AbortController()
          controllers.add(controller)
          const timer = setTimeout(() => controller.abort(), TIMEOUT)
          const aborted = new Promise<null>((done) =>
            controller.signal.addEventListener('abort', () => done(null), {
              once: true,
            }),
          )
          Promise.race([load(id, url, controller.signal), aborted])
            .then(
              (image) => resolve(generation === startGeneration ? image : null),
              () => resolve(null),
            )
            .finally(() => {
              clearTimeout(timer)
              controllers.delete(controller)
              active--
              while (active < 4 && waiting.length) waiting.shift()!()
            })
        }
        if (active < 4) start()
        else waiting.push(start)
      })
      pending.set(key, result)
      void result.finally(() => {
        if (pending.get(key) === result) pending.delete(key)
      })
      return result
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
