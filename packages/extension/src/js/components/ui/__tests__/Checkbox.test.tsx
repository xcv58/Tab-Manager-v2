import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppThemeContext, darkAppTheme, lightAppTheme } from 'libs/appTheme'
import { StoreContext } from 'components/hooks/useStore'
import Checkbox from '../Checkbox'

const renderCheckbox = ({
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
        <Checkbox
          checked={checked}
          aria-label="Select all tabs"
          onChange={() => {}}
        />
      </AppThemeContext.Provider>
    </StoreContext.Provider>,
  )

describe('Checkbox', () => {
  it('shows a visible focus ring when the hidden checkbox receives focus', () => {
    renderCheckbox()

    const input = screen.getByRole('checkbox', { name: 'Select all tabs' })
    fireEvent.focus(input)

    expect(input.parentElement).toHaveStyle(
      'box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.24)',
    )
  })

  it('uses a stronger unchecked icon color when contrast is enabled in dark mode', () => {
    const { container } = renderCheckbox({
      increaseContrast: true,
      theme: darkAppTheme,
    })

    expect(container.querySelector('svg')).toHaveAttribute('fill', '#e2e8f0')
  })

  it('uses a stronger checked icon color when contrast is enabled in dark mode', () => {
    const { container } = renderCheckbox({
      checked: true,
      increaseContrast: true,
      theme: darkAppTheme,
    })

    expect(container.querySelector('svg')).toHaveAttribute('fill', '#d8e4f7')
  })
})
