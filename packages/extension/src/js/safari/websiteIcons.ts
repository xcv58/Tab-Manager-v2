import type { WebsiteIcons } from 'libs/websiteIcons'
import { websiteOriginPattern } from 'libs/websiteOriginPattern'
import { createWebsiteIconQueue } from './websiteIconQueue'

const MAX_BYTES = 256 * 1024
const MAX_CACHE = 128

// Lives only in the extension page's memory, not in synced storage or a server.
export const createWebsiteIcons = (raw: any): WebsiteIcons => {
  const cache = new Map<string, { image: string | null; expires: number }>()
  // Only icon hosts discovered from a current, permitted normal tab are
  // considered for a later user-triggered access request. Never persist them.
  const missingHosts = new Map<string, string[]>()
  const accessOrigins = (urls: string[]) => [
    ...new Set(
      urls.flatMap((url) => {
        const origin = websiteOriginPattern(url)
        return origin ? [origin, ...(missingHosts.get(url) || [])] : []
      }),
    ),
  ]
  const listeners = new Set<(tabId?: number) => void>()
  const invalidate = () => {
    cache.clear()
    missingHosts.clear()
    queue.invalidate()
    listeners.forEach((listener) => listener())
  }
  raw.permissions?.onAdded?.addListener(invalidate)
  raw.permissions?.onRemoved?.addListener(invalidate)
  raw.storage.onChanged.addListener((changes: any, area: string) => {
    if (area === 'local' && changes.showTabIcon) invalidate()
  })
  raw.tabs.onUpdated?.addListener((id: number, changes: any, tab: any) => {
    // A background tab finishing a load must not cancel every visible icon.
    if (changes.url || changes.status === 'complete') {
      cache.delete(tab?.url || changes.url)
      missingHosts.delete(tab?.url || changes.url)
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
  const recordMissingHosts = (id: number, url: string, origins: string[]) => {
    const previous = missingHosts.get(url) || []
    if (JSON.stringify(previous) === JSON.stringify(origins)) return
    if (origins.length) {
      if (missingHosts.size >= MAX_CACHE)
        missingHosts.delete(missingHosts.keys().next().value!)
      missingHosts.set(url, origins)
    } else missingHosts.delete(url)
    listeners.forEach((listener) => listener(id))
  }
  const usableCandidate = (candidate: string, page: string) => {
    if (!websiteOriginPattern(candidate)) return false
    const icon = new URL(candidate)
    if (icon.origin === new URL(page).origin) return true
    // Declared CDN icons may use existing permission or ask in Settings. Do
    // not turn a page's icon link into a local-network or alternate-port probe.
    return (
      icon.protocol === 'https:' &&
      !icon.port &&
      icon.hostname.includes('.') &&
      !icon.hostname.includes(':') &&
      !/^[0-9.]+$/.test(icon.hostname) &&
      !/(^|\.)(localhost|local|internal)\.?$/i.test(icon.hostname)
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
      cache: 'no-store',
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
    // SVG is decoded only as an Image, never inserted as markup. Image mode
    // disables scripts and external resources; the UI receives a 32px PNG.
    if (
      ![
        'image/png',
        'image/svg+xml',
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
    const settings = await raw.storage.local.get(['showTabIcon'])
    if (
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
    const missing = new Set<string>()
    for (const candidate of [...new Set(candidates)]) {
      if (signal.aborted) return null
      if (typeof candidate !== 'string' || !usableCandidate(candidate, url))
        continue
      try {
        if (!(await allowed(candidate))) {
          missing.add(websiteOriginPattern(candidate)!)
          continue
        }
        image = await fetchIcon(candidate, signal)
      } catch {
        /* Use the shared neutral placeholder on missing/offline/denied icons. */
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
    // A missing/invalid/offline image is not a permission failure. Only offer
    // access for denied hosts when no already-permitted fallback worked.
    recordMissingHosts(id, url, image ? [] : [...missing].sort())
    return image
  }
  const queue = createWebsiteIconQueue(load)
  return {
    hasAccess: async (urls) => {
      const origins = accessOrigins(urls)
      return (
        !origins.length ||
        (await raw.permissions?.contains({ origins })) === true
      )
    },
    // Called directly in the Settings click handler, before any await.
    requestAccess: (urls) => {
      const origins = accessOrigins(urls)
      if (!origins.length || !raw.permissions?.request)
        return Promise.resolve(false)
      return raw.permissions.request({ origins })
    },
    resolve: (id, url, signal) => {
      if (!Number.isInteger(id) || !websiteOriginPattern(url))
        return Promise.resolve(null)
      return queue.resolve(id, url, signal)
    },
    waitForCapacity: queue.waitForCapacity,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
