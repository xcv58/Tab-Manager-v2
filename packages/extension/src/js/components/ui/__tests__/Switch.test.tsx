import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppThemeContext, lightAppTheme } from 'libs/appTheme'
import Switch from '../Switch'

describe('Switch', () => {
  it('shows a visible focus ring when the hidden checkbox receives focus', () => {
    render(
      <AppThemeContext.Provider value={lightAppTheme}>
        <Switch
          checked={false}
          onChange={() => {}}
          inputProps={{ 'aria-label': 'Focus search on open' }}
        />
      </AppThemeContext.Provider>,
    )

    const input = screen.getByRole('checkbox', { name: 'Focus search on open' })
    fireEvent.focus(input)

    expect(screen.getByTestId('switch-track')).toHaveStyle({
      boxShadow: `0 0 0 3px ${lightAppTheme.palette.primary.main}3d`,
    })
  })
})
