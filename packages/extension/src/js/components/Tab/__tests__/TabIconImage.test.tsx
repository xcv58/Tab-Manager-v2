import React from 'react'
import { observable, runInAction } from 'mobx'
import { render, waitFor, act } from '@testing-library/react'
import TabIconImage from '../TabIconImage'

let mockBridge: any
const mockUser = observable({ showTabIcon: true, loadWebsiteIcons: false })
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
  mockUser.loadWebsiteIcons = false
})

it('keeps the original browser-provided icon in Chrome and Firefox', () => {
  render(<TabIconImage tab={tab} />)
  expect(document.querySelector('img')).toHaveAttribute('src', tab.iconUrl)
})

it('uses local initials without resolving a website while icon loading is off', () => {
  mockBridge = { resolve: jest.fn(), subscribe: jest.fn(() => () => {}) }
  render(<TabIconImage tab={tab} />)
  expect(document.querySelector('img')!.src).toContain('data:image/svg+xml,')
  expect(mockBridge.resolve).not.toHaveBeenCalled()
})

it('never requests live website metadata from static Settings previews', () => {
  mockBridge = { resolve: jest.fn(), subscribe: jest.fn(() => () => {}) }
  mockUser.loadWebsiteIcons = true
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
  mockUser.loadWebsiteIcons = true
  const view = render(<TabIconImage tab={tab} />)
  await waitFor(() =>
    expect(mockBridge.resolve).toHaveBeenCalledWith(1, tab.url),
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
      mockUser.loadWebsiteIcons = false
    }),
  )
  view.rerender(<TabIconImage tab={next} />)
  expect(document.querySelector('img')!.src).toContain('data:image/svg+xml,')
})
