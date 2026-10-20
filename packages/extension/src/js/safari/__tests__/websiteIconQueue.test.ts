import { WebsiteIconBusyError } from 'libs/WebsiteIconBusyError'
import { createWebsiteIconQueue } from '../websiteIconQueue'

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}
const fixture = () => {
  const completions = new Map<number, (image: string | null) => void>()
  const load = jest.fn(
    (id: number, _url: string, _signal: AbortSignal) =>
      new Promise<string | null>((resolve) => completions.set(id, resolve)),
  )
  return { load, completions, queue: createWebsiteIconQueue(load) }
}
afterEach(() => jest.useRealTimers())

it('bounds the queue and lets a visible overflow consumer finish when capacity returns', async () => {
  const f = fixture()
  const tasks = Array.from({ length: 68 }, (_, id) =>
    f.queue.resolve(id, `https://example.com/${id}`),
  )
  await expect(
    f.queue.resolve(68, 'https://example.com/68'),
  ).rejects.toBeInstanceOf(WebsiteIconBusyError)
  expect(f.load).toHaveBeenCalledTimes(4)
  let ready = false
  const controller = new AbortController()
  const capacity = f.queue.waitForCapacity(controller.signal).then(() => {
    ready = true
  })
  await flush()
  expect(ready).toBe(false)
  f.completions.get(0)!('first')
  await capacity
  const overflow = f.queue.resolve(68, 'https://example.com/68')
  for (let id = 1; id < 69; id++) {
    await flush()
    expect(f.completions.has(id)).toBe(true)
    f.completions.get(id)!(`icon-${id}`)
  }
  expect(await overflow).toBe('icon-68')
  expect((await Promise.all(tasks))[0]).toBe('first')
})

it('removes offscreen queued work before Safari is called and releases capacity', async () => {
  const f = fixture()
  const active = Array.from({ length: 4 }, (_, id) =>
    f.queue.resolve(id, `https://example.com/${id}`),
  )
  const controller = new AbortController()
  const offscreen = f.queue.resolve(
    4,
    'https://example.com/4',
    controller.signal,
  )
  controller.abort()
  expect(await offscreen).toBeNull()
  f.completions.get(0)!('first')
  await flush()
  expect(f.load).toHaveBeenCalledTimes(4)
  f.queue.invalidate()
  await Promise.all(active)
})

it('cancels active work only after all rows sharing the same tab leave view', async () => {
  const f = fixture()
  const first = new AbortController()
  const second = new AbortController()
  const a = f.queue.resolve(1, 'https://example.com/1', first.signal)
  const b = f.queue.resolve(1, 'https://example.com/1', second.signal)
  const signal = f.load.mock.calls[0][2]
  first.abort()
  expect(await a).toBeNull()
  expect(signal.aborted).toBe(false)
  second.abort()
  expect(await b).toBeNull()
  expect(signal.aborted).toBe(true)
  await flush()
  const next = f.queue.resolve(1, 'https://example.com/1')
  expect(f.load).toHaveBeenCalledTimes(2)
  f.completions.get(1)!('new icon')
  expect(await next).toBe('new icon')
})

it('releases stale active slots after a timeout even if Safari never responds', async () => {
  jest.useFakeTimers()
  const f = fixture()
  const first = Array.from({ length: 4 }, (_, id) =>
    f.queue.resolve(id, `https://example.com/${id}`),
  )
  const next = f.queue.resolve(4, 'https://example.com/4')
  await jest.advanceTimersByTimeAsync(8001)
  expect(await Promise.all(first)).toEqual([null, null, null, null])
  expect(f.load).toHaveBeenCalledTimes(5)
  f.completions.get(4)!('next')
  expect(await next).toBe('next')
})

it('unregisters an overflow waiter when its row leaves view', async () => {
  const f = fixture()
  const tasks = Array.from({ length: 68 }, (_, id) =>
    f.queue.resolve(id, `https://example.com/${id}`),
  )
  const controller = new AbortController()
  const wait = f.queue.waitForCapacity(controller.signal)
  controller.abort()
  await wait
  f.queue.invalidate()
  expect(await Promise.all(tasks)).toEqual(Array(68).fill(null))
})
