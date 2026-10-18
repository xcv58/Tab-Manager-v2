import { readFileSync } from 'fs'
import { join } from 'path'

const shellHTML = readFileSync(join(__dirname, '../../../demo.html'), 'utf8')
const state = { tabCount: 30, windowCount: 3, groupCount: 5 }
let windowListeners: jest.SpyInstance
let documentListeners: jest.SpyInstance
const frame = () => document.querySelector<HTMLIFrameElement>('#demo-frame')!
const chooseView = (view: 'full' | 'popup') =>
  document
    .querySelector<HTMLButtonElement>(`[data-demo-view="${view}"]`)!
    .click()
const report = (
  view: 'full' | 'popup',
  viewRequestId = 0,
  source = frame().contentWindow,
  origin = window.location.origin,
) =>
  window.dispatchEvent(
    new MessageEvent('message', {
      origin,
      source,
      data: { type: 'demo:state', view, viewRequestId, state },
    }),
  )
const expectView = (view: 'full' | 'popup') => {
  expect(document.querySelector('#workspace')).toHaveAttribute(
    'data-view',
    view,
  )
  expect(document.querySelector(`[data-demo-view="${view}"]`)).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(new URL(window.location.href).searchParams.get('view')).toBe(view)
}

beforeEach(async () => {
  jest.useFakeTimers()
  jest.resetModules()
  window.history.replaceState(null, '', '/demo/?view=full')
  document.body.innerHTML = new DOMParser().parseFromString(
    shellHTML,
    'text/html',
  ).body.innerHTML
  window.matchMedia = jest
    .fn()
    .mockReturnValue({ matches: false, addEventListener: jest.fn() })
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  windowListeners = jest.spyOn(window, 'addEventListener')
  documentListeners = jest.spyOn(document, 'addEventListener')
  await import('../../demo-shell')
})
afterEach(() => {
  for (const [type, listener, options] of windowListeners.mock.calls)
    window.removeEventListener(type, listener, options)
  for (const [type, listener, options] of documentListeners.mock.calls)
    document.removeEventListener(type, listener, options)
  jest.restoreAllMocks()
  jest.clearAllTimers()
  jest.useRealTimers()
  document.body.innerHTML = ''
  window.history.replaceState(null, '', '/')
})

it('replays only the latest choice after a slow iframe becomes ready', () => {
  const postMessage = jest.spyOn(frame().contentWindow!, 'postMessage')
  chooseView('popup')
  chooseView('full')
  chooseView('popup')
  expect(postMessage).not.toHaveBeenCalled()
  report('full')
  expectView('popup')
  expect(postMessage).toHaveBeenCalledTimes(1)
  expect(postMessage).toHaveBeenCalledWith(
    { type: 'demo:set-view', view: 'popup', viewRequestId: 3 },
    window.location.origin,
  )
  report('popup', 3)
  expectView('popup')
  expect(document.querySelector('#demo-loading')).not.toBeVisible()
})

it('ignores stale replies during rapid toggles but accepts a child Open in tab action', () => {
  const postMessage = jest.spyOn(frame().contentWindow!, 'postMessage')
  report('full')
  chooseView('popup')
  chooseView('full')
  chooseView('popup')
  report('popup', 1)
  report('full', 2)
  expectView('popup')
  report('popup', 3)
  expect(postMessage).toHaveBeenLastCalledWith(
    { type: 'demo:set-view', view: 'popup', viewRequestId: 3 },
    window.location.origin,
  )
  // After acknowledging the latest choice, the child may switch to full view.
  report('full', 3)
  expectView('full')
})

it.each(['scenario', 'reset'])(
  'keeps the latest view through %s reloads',
  (reload) => {
    report('full')
    chooseView('popup')
    report('popup', 1)
    const previousFrame = frame().contentWindow
    if (reload === 'scenario') {
      const scenario = document.querySelector<HTMLSelectElement>('#scenario')!
      scenario.value = 'many-windows'
      scenario.dispatchEvent(new Event('change'))
    } else {
      document.querySelector<HTMLButtonElement>('#reset-demo')!.click()
    }
    expect(new URL(frame().src).searchParams.has('popup_preview')).toBe(true)
    const postMessage = jest.spyOn(frame().contentWindow!, 'postMessage')
    chooseView('full')
    report('full', 1, previousFrame)
    expect(postMessage).not.toHaveBeenCalled()
    report('popup')
    expectView('full')
    expect(postMessage).toHaveBeenCalledWith(
      { type: 'demo:set-view', view: 'full', viewRequestId: 1 },
      window.location.origin,
    )
    report('full', 1)
    expectView('full')
  },
)

it('does not let a foreign origin establish readiness or change the view', () => {
  chooseView('popup')
  const postMessage = jest.spyOn(frame().contentWindow!, 'postMessage')
  report('full', 0, frame().contentWindow, 'https://example.com')
  expectView('popup')
  expect(postMessage).not.toHaveBeenCalled()
  expect(document.querySelector('#demo-loading')).toBeVisible()
})
