import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import Switch from '../Switch'

describe('Switch', () => {
  it('shows a visible focus ring when the hidden checkbox receives focus', () => {
    render(
      <Switch
        checked={false}
        onChange={() => {}}
        inputProps={{ 'aria-label': 'Focus search on open' }}
      />,
    )

    const input = screen.getByRole('checkbox', { name: 'Focus search on open' })
    fireEvent.focus(input)

    expect(screen.getByTestId('switch-track')).toHaveStyle(
      'box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.24)',
    )
  })
})
