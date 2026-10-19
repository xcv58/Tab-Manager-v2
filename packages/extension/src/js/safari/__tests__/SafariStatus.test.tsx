import React from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { useStore } from 'components/hooks/useStore'
import { browser } from 'libs'
import SafariStatus from '../SafariStatus'
import { safariState } from '../state'

jest.mock('components/hooks/useStore', () => ({ useStore: jest.fn() }))
jest.mock('libs', () => ({
  browser: {
    storage: { local: { get: jest.fn(), remove: jest.fn() } },
  },
}))

const mockUseStore = useStore as jest.Mock
const mockGet = browser.storage.local.get as jest.Mock
const mockRemove = browser.storage.local.remove as jest.Mock
const mockRefresh = jest.fn()
const originalHostAppUrl = process.env.SAFARI_HOST_APP_URL

beforeEach(() => {
  jest.clearAllMocks()
  safariState.dismissError()
  mockGet.mockResolvedValue({})
  mockRemove.mockResolvedValue(undefined)
  mockRefresh.mockResolvedValue(undefined)
  mockUseStore.mockReturnValue({
    windowStore: { updateAllWindows: mockRefresh },
  })
  process.env.SAFARI_HOST_APP_URL = 'tabmanager-safari-prototype://open'
})

afterEach(() => {
  cleanup()
  safariState.dismissError()
  if (originalHostAppUrl === undefined) delete process.env.SAFARI_HOST_APP_URL
  else process.env.SAFARI_HOST_APP_URL = originalHostAppUrl
})

it('reserves no space or access controls when there is no error', () => {
  const { container } = render(<SafariStatus />)

  expect(container).toBeEmptyDOMElement()
})

it('shows permission guidance and the setup link only with an error', () => {
  safariState.showError(
    new Error('Allow website access in Safari, then refresh.'),
  )
  render(<SafariStatus />)

  expect(screen.getByRole('alert')).toHaveTextContent(
    'Allow website access in Safari, then refresh.',
  )
  expect(screen.getByRole('link', { name: 'Safari access' })).toHaveAttribute(
    'href',
    'tabmanager-safari-prototype://open',
  )
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Dismiss' })).toBeVisible()
})

it('dismisses the error and removes the entire status row', () => {
  safariState.showError(new Error('Safari could not complete this action.'))
  const { container } = render(<SafariStatus />)

  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

  expect(container).toBeEmptyDOMElement()
  expect(mockRefresh).not.toHaveBeenCalled()
})

it('refreshes the workspace and removes resolved errors', async () => {
  safariState.showError(new Error('Safari did not respond.'))
  const { container } = render(<SafariStatus />)

  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

  await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
  expect(container).toBeEmptyDOMElement()
})

it('keeps recovery controls available when refreshing fails', async () => {
  safariState.showError(new Error('Safari did not respond.'))
  mockRefresh.mockRejectedValue(new Error('Allow website access in Safari.'))
  render(<SafariStatus />)

  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Allow website access in Safari.',
  )
  expect(screen.getByRole('link', { name: 'Safari access' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Dismiss' })).toBeVisible()
})

it('shows a stored launch error and consumes it once', async () => {
  mockGet.mockResolvedValue({
    safariLaunchError: 'Safari could not open this view.',
  })
  render(<SafariStatus />)

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Safari could not open this view.',
  )
  expect(mockGet).toHaveBeenCalledWith('safariLaunchError')
  expect(mockRemove).toHaveBeenCalledWith('safariLaunchError')
})
