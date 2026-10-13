import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import TabRowPreview from '../TabRowPreview'

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
