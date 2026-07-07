import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppThemeContext, darkAppTheme, lightAppTheme } from 'libs/appTheme'
import { StoreContext } from 'components/hooks/useStore'
import Switch from '../Switch'

const renderSwitch = ({
  checked = false,
  increaseContrast = false,
  theme = lightAppTheme,
}: {
  checked?: boolean
  increaseContrast?: boolean
  theme?: typeof lightAppTheme
} = {}) =>
  render(
    <StoreContext.Provider value={{ userStore: { increaseContrast } } as any}>
      <AppThemeContext.Provider value={theme}>
        <Switch
          checked={checked}
          onChange={() => {}}
          inputProps={{ 'aria-label': 'Focus search on open' }}
        />
      </AppThemeContext.Provider>
    </StoreContext.Provider>,
  )

describe('Switch', () => {
  it('shows a visible focus ring when the hidden checkbox receives focus', () => {
    renderSwitch()

    const input = screen.getByRole('checkbox', { name: 'Focus search on open' })
    fireEvent.focus(input)

    expect(screen.getByTestId('switch-track')).toHaveStyle({
      boxShadow: `0 0 0 3px ${lightAppTheme.palette.primary.main}3d`,
    })
  })

  it('uses a stronger off track when contrast is enabled in dark mode', () => {
    renderSwitch({ increaseContrast: true, theme: darkAppTheme })

    expect(screen.getByTestId('switch-track')).toHaveStyle({
      backgroundColor: 'rgba(226, 232, 240, 0.5)',
    })
  })

  it('uses a high-contrast checked track and thumb in dark mode', () => {
    renderSwitch({
      checked: true,
      increaseContrast: true,
      theme: darkAppTheme,
    })

    const track = screen.getByTestId('switch-track')

    expect(track).toHaveStyle({ backgroundColor: '#d8e4f7' })
    expect(track.querySelector('span')).toHaveStyle({
      backgroundColor: '#1f242b',
    })
  })
})
