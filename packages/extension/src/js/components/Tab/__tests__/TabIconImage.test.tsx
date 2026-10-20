import React from 'react'
import { observable, runInAction } from 'mobx'
import { render, waitFor, act } from '@testing-library/react'
import TabIconImage from '../TabIconImage'
import emptyIcon from 'img/chrome/empty.png'
import { WebsiteIconBusyError } from 'libs/WebsiteIconBusyError'

let mockBridge: any
const mockUser = observable({ showTabIcon: true })
jest.mock('libs/websiteIcons', () => ({
  get websiteIcons() {
    return mockBridge
  },
}))
jest.mock('components/hooks/useStore', () => ({
  useStore: () => ({ userStore: mockUser }),
}))
const tab = {
  id: 1,
  url: 'https://example.com/one',
  title: 'One',
  iconUrl: 'data:image/png;base64,b3JpZ2luYWw=',
} as any
beforeEach(() => {
  mockBridge = undefined
  mockUser.showTabIcon = true
})

it('keeps the original browser-provided icon in Chrome and Firefox', () => {
  render(<TabIconImage tab={tab} />)
  expect(document.querySelector('img')).toHaveAttribute('src', tab.iconUrl)
})

it('uses the shared neutral placeholder without resolving a website while icons are hidden', () => {
  mockUser.showTabIcon = false
  mockBridge = { resolve: jest.fn(), subscribe: jest.fn(() => () => {}) }
  render(<TabIconImage tab={tab} />)
  expect(document.querySelector('img')).toHaveAttribute('src', emptyIcon)
  expect(mockBridge.resolve).not.toHaveBeenCalled()
})

it('never requests live website metadata from static Settings previews', () => {
  mockBridge = { resolve: jest.fn(), subscribe: jest.fn(() => () => {}) }
  mockUser.showTabIcon = true
  render(<TabIconImage tab={tab} faked />)
  expect(document.querySelector('img')).toHaveAttribute('src', tab.iconUrl)
  expect(mockBridge.resolve).not.toHaveBeenCalled()
})

it('discards a previous tab’s late icon and falls back immediately when loading is disabled', async () => {
  let finishOld: (value: string) => void
  const resolved = 'data:image/png;base64,bmV3'
  mockBridge = {
    subscribe: jest.fn(() => () => {}),
    resolve: jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve
          }),
      )
      .mockResolvedValue(resolved),
  }
  mockUser.showTabIcon = true
  const view = render(<TabIconImage tab={tab} />)
  await waitFor(() =>
    expect(mockBridge.resolve).toHaveBeenCalledWith(
      1,
      tab.url,
      expect.any(AbortSignal),
    ),
  )
  const next = { ...tab, id: 2, url: 'https://another.example/two' }
  view.rerender(<TabIconImage tab={next} />)
  await waitFor(() =>
    expect(document.querySelector('img')).toHaveAttribute('src', resolved),
  )
  await act(async () => {
    finishOld!('data:image/png;base64,b2xk')
  })
  expect(document.querySelector('img')).toHaveAttribute('src', resolved)
  act(() =>
    runInAction(() => {
      mockUser.showTabIcon = false
    }),
  )
  view.rerender(<TabIconImage tab={next} />)
  expect(document.querySelector('img')).toHaveAttribute('src', emptyIcon)
})

it('retries temporary queue pressure once capacity returns, but does not retry a missing icon', async () => {
  let available: () => void
  mockBridge = {
    subscribe: jest.fn(() => () => {}),
    resolve: jest
      .fn()
      .mockRejectedValueOnce(new WebsiteIconBusyError())
      .mockResolvedValue(null),
    waitForCapacity: jest.fn(
      () =>
        new Promise<void>((resolve) => {
          available = resolve
        }),
    ),
  }
  render(<TabIconImage tab={tab} />)
  await waitFor(() =>
    expect(mockBridge.waitForCapacity).toHaveBeenCalledTimes(1),
  )
  expect(mockBridge.resolve).toHaveBeenCalledTimes(1)
  await act(async () => available!())
  expect(mockBridge.resolve).toHaveBeenCalledTimes(2)
  expect(document.querySelector('img')).toHaveAttribute('src', emptyIcon)
  expect(mockBridge.waitForCapacity).toHaveBeenCalledTimes(1)
})

it('cancels loading when its image leaves the viewport and restarts when visible again', async () => {
  const original = globalThis.IntersectionObserver
  let changed: IntersectionObserverCallback
  globalThis.IntersectionObserver = class {
    constructor(callback: IntersectionObserverCallback) {
      changed = callback
    }
    observe() {}
    disconnect() {}
  } as any
  try {
    mockBridge = {
      subscribe: jest.fn(() => () => {}),
      resolve: jest.fn().mockResolvedValue(null),
    }
    const view = render(<TabIconImage tab={tab} />)
    expect(mockBridge.resolve).not.toHaveBeenCalled()
    act(() => changed!([{ isIntersecting: true }] as any, {} as any))
    await waitFor(() => expect(mockBridge.resolve).toHaveBeenCalledTimes(1))
    const signal = mockBridge.resolve.mock.calls[0][2]
    act(() => changed!([{ isIntersecting: false }] as any, {} as any))
    expect(signal.aborted).toBe(true)
    act(() => changed!([{ isIntersecting: true }] as any, {} as any))
    await waitFor(() => expect(mockBridge.resolve).toHaveBeenCalledTimes(2))
    const latest = mockBridge.resolve.mock.calls[1][2]
    view.unmount()
    expect(latest.aborted).toBe(true)
  } finally {
    globalThis.IntersectionObserver = original
  }
})
