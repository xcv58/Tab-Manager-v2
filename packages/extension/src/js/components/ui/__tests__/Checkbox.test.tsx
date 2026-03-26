import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppThemeContext, lightAppTheme } from 'libs/appTheme'
import Checkbox from '../Checkbox'

describe('Checkbox', () => {
  it('shows a visible focus ring when the hidden checkbox receives focus', () => {
    render(
      <AppThemeContext.Provider value={lightAppTheme}>
        <Checkbox aria-label="Select all tabs" onChange={() => {}} />
      </AppThemeContext.Provider>,
    )

    const input = screen.getByRole('checkbox', { name: 'Select all tabs' })
    fireEvent.focus(input)

    expect(input.parentElement).toHaveStyle(
      'box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.24)',
    )
  })
})
