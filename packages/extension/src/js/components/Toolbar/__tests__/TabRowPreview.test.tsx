import React from 'react'

let mockBridge: any
jest.mock('libs/websiteIcons', () => ({
  get websiteIcons() {
    return mockBridge
  },
}))
beforeEach(() => {
  mockBridge = undefined
})
import { fireEvent, render, screen } from '@testing-library/react'
import TabRowPreview, { TabRowsPreview } from '../TabRowPreview'

test('active indicators reflect actual preview window membership', () => {
  const first = {
    id: 1,
    title: 'App window',
    url: 'https://music.example.test',
    active: true,
  }
  const { rerender } = render(<TabRowsPreview configs={[first]} />)
  expect(screen.queryByTestId('tab-active-indicator-1')).not.toBeInTheDocument()
  rerender(
    <TabRowsPreview
      configs={[
        first,
        { id: 2, title: 'Second tab', url: 'https://notes.example.test' },
      ]}
    />,
  )
  expect(screen.getByTestId('tab-active-indicator-1')).toBeInTheDocument()
})

test('sample tab selection and focus work without exposing pretend destructive actions', () => {
  render(
    <TabRowPreview
      config={{
        id: 1,
        title: 'Preview tab',
        url: 'https://example.com/preview',
        showTabIcon: true,
        showUrl: true,
      }}
    />,
  )
  const checkbox = screen.getByRole('checkbox', { name: 'Toggle select' })
  expect(checkbox.tabIndex).toBe(0)
  expect(checkbox).not.toBeChecked()
  fireEvent.click(checkbox)
  expect(checkbox).toBeChecked()
  expect(screen.getByRole('button', { name: /Preview tab/ }).tabIndex).toBe(0)
  expect(
    screen.queryByRole('button', { name: 'Tab actions' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Close' }),
  ).not.toBeInTheDocument()
})

test('the actual Safari Settings row uses its sample icon without live lookups and remains interactive', () => {
  mockBridge = { resolve: jest.fn(), subscribe: jest.fn(() => () => {}) }
  const iconUrl = 'data:image/svg+xml,sample-settings-icon'
  render(
    <TabRowPreview
      config={{
        id: 1,
        title: 'Static example',
        url: 'https://example.com/',
        iconUrl,
      }}
    />,
  )
  expect(document.querySelector('img')).toHaveAttribute('src', iconUrl)
  expect(mockBridge.resolve).not.toHaveBeenCalled()
  const checkbox = screen.getByRole('checkbox', { name: 'Toggle select' })
  fireEvent.click(checkbox)
  expect(checkbox).toBeChecked()
  expect(mockBridge.resolve).not.toHaveBeenCalled()
})
