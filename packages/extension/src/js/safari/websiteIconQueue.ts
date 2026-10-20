import { WebsiteIconBusyError } from 'libs/WebsiteIconBusyError'

const MAX_ACTIVE = 4
const MAX_WAITING = 64
const TIMEOUT = 8000

type Job = {
  key: string
  id: number
  url: string
  controller: AbortController
  started: boolean
  settled: boolean
  consumers: number
  promise: Promise<string | null>
  finish: (image: string | null) => void
}

// Only visible consumers retain work. Overflow waits for capacity separately
// from missing icons, so it is retried without polling or negative caching.
export const createWebsiteIconQueue = (
  load: (
    id: number,
    url: string,
    signal: AbortSignal,
  ) => Promise<string | null>,
) => {
  const pending = new Map<string, Job>()
  const waiting: Job[] = []
  const capacityWaiters = new Set<() => void>()
  let active = 0
  const available = () => MAX_ACTIVE - active + MAX_WAITING - waiting.length
  const notifyCapacity = () => {
    const slots = available()
    ;[...capacityWaiters].slice(0, slots).forEach((ready) => ready())
  }
  const cancel = (job: Job) => {
    if (job.settled) return
    job.controller.abort()
    if (!job.started) {
      const index = waiting.indexOf(job)
      if (index >= 0) waiting.splice(index, 1)
    }
    job.finish(null)
    notifyCapacity()
  }
  const start = (job: Job) => {
    job.started = true
    active++
    const { signal } = job.controller
    const timer = setTimeout(() => job.controller.abort(), TIMEOUT)
    let aborted: () => void
    const interruption = new Promise<null>((resolve) => {
      aborted = () => resolve(null)
      signal.addEventListener('abort', aborted, { once: true })
    })
    Promise.race([load(job.id, job.url, signal), interruption])
      .then(
        (image) => job.finish(signal.aborted ? null : image),
        () => job.finish(null),
      )
      .finally(() => {
        clearTimeout(timer)
        signal.removeEventListener('abort', aborted)
        active--
        while (active < MAX_ACTIVE && waiting.length) start(waiting.shift()!)
        notifyCapacity()
      })
  }
  const consume = (job: Job, signal?: AbortSignal) => {
    job.consumers++
    return new Promise<string | null>((resolve) => {
      let finished = false
      const finish = (image: string | null) => {
        if (finished) return
        finished = true
        signal?.removeEventListener('abort', abort)
        job.consumers--
        if (!job.consumers && !job.settled) cancel(job)
        resolve(image)
      }
      const abort = () => finish(null)
      signal?.addEventListener('abort', abort, { once: true })
      void job.promise.then(finish)
      if (signal?.aborted) abort()
    })
  }
  return {
    resolve: (id: number, url: string, signal?: AbortSignal) => {
      if (signal?.aborted) return Promise.resolve(null)
      const key = `${id}:${url}`
      const existing = pending.get(key)
      if (existing) return consume(existing, signal)
      if (!available()) return Promise.reject(new WebsiteIconBusyError())
      let complete: (image: string | null) => void
      const promise = new Promise<string | null>((resolve) => {
        complete = resolve
      })
      const job: Job = {
        key,
        id,
        url,
        controller: new AbortController(),
        started: false,
        settled: false,
        consumers: 0,
        promise,
        finish: (image) => {
          if (job.settled) return
          job.settled = true
          if (pending.get(key) === job) pending.delete(key)
          complete(image)
        },
      }
      pending.set(key, job)
      const result = consume(job, signal)
      if (active < MAX_ACTIVE) start(job)
      else waiting.push(job)
      return result
    },
    waitForCapacity: (signal: AbortSignal) => {
      if (signal.aborted || available()) return Promise.resolve()
      return new Promise<void>((resolve) => {
        const ready = () => {
          capacityWaiters.delete(ready)
          signal.removeEventListener('abort', ready)
          resolve()
        }
        capacityWaiters.add(ready)
        signal.addEventListener('abort', ready, { once: true })
      })
    },
    invalidate: () => {
      ;[...pending.values()].forEach(cancel)
    },
  }
}
