import React from 'react'
import { observable, runInAction } from 'mobx'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import WebsiteIconAccess from '../WebsiteIconAccess'

const mockUser = observable({ showTabIcon: true })
const mockWindow = observable({
  tabs: [] as { url: string; incognito?: boolean }[],
})
let mockBridge: any
jest.mock('libs/websiteIcons', () => ({
  get websiteIcons() {
    return mockBridge
  },
}))
jest.mock('components/hooks/useStore', () => ({
  useStore: () => ({ userStore: mockUser, windowStore: mockWindow }),
}))

beforeEach(() => {
  runInAction(() => {
    mockUser.showTabIcon = true
    mockWindow.tabs = []
  })
  mockBridge = {
    hasAccess: jest.fn().mockResolvedValue(true),
    requestAccess: jest.fn().mockResolvedValue(true),
    subscribe: jest.fn(() => () => {}),
  }
})

it('offers manual recovery for a completely redacted workspace without guessing permission or requesting access', () => {
  mockWindow.tabs = [{ url: '' }]
  render(<WebsiteIconAccess />)
  expect(
    screen.getByText(/Safari has not shared website details/),
  ).toBeInTheDocument()
  expect(screen.getByText('Check Safari website access')).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(mockBridge.hasAccess).not.toHaveBeenCalled()
  expect(mockBridge.requestAccess).not.toHaveBeenCalled()
})

it('retains manual recovery when readable origins have access but another normal tab is redacted', async () => {
  mockWindow.tabs = [{ url: 'https://example.com/one' }, { url: '' }]
  render(<WebsiteIconAccess />)
  await waitFor(() =>
    expect(mockBridge.hasAccess).toHaveBeenCalledWith([
      'https://example.com/one',
    ]),
  )
  expect(screen.getByText('Check Safari website access')).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('requests only known websites from the click and keeps manual help for remaining hidden tabs', async () => {
  mockWindow.tabs = [{ url: 'https://example.com/one' }, { url: '' }]
  mockBridge.hasAccess.mockResolvedValueOnce(false).mockResolvedValue(true)
  render(<WebsiteIconAccess />)
  const button = await screen.findByRole('button', {
    name: 'Allow website access',
  })
  fireEvent.click(button)
  expect(mockBridge.requestAccess).toHaveBeenCalledWith([
    'https://example.com/one',
  ])
  await waitFor(() =>
    expect(screen.queryByRole('button')).not.toBeInTheDocument(),
  )
  expect(screen.getByText('Check Safari website access')).toBeInTheDocument()
})

it('does not infer a permission problem from a readable page with a missing icon, private tab, or known internal page', async () => {
  mockWindow.tabs = [
    { url: 'https://example.com/one' },
    { url: '', incognito: true },
    { url: 'favorites://' },
  ]
  const view = render(<WebsiteIconAccess />)
  await waitFor(() => expect(mockBridge.hasAccess).toHaveBeenCalledTimes(1))
  expect(view.container).toBeEmptyDOMElement()
})

it('hides manual guidance when icons are disabled or the last redacted tab disappears', async () => {
  mockWindow.tabs = [{ url: '' }]
  const view = render(<WebsiteIconAccess />)
  act(() =>
    runInAction(() => {
      mockUser.showTabIcon = false
    }),
  )
  expect(view.container).toBeEmptyDOMElement()
  act(() =>
    runInAction(() => {
      mockUser.showTabIcon = true
      mockWindow.tabs = []
    }),
  )
  expect(view.container).toBeEmptyDOMElement()
})
