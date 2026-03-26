import React from 'react'
import { render, screen } from '@testing-library/react'
import IconButton from '../IconButton'
import { AppThemeContext, lightAppTheme } from 'libs/appTheme'

const renderIconButton = (
  props: React.ComponentProps<typeof IconButton> = {},
) =>
  render(
    <AppThemeContext.Provider value={lightAppTheme}>
      <IconButton aria-label="Sync all windows" {...props}>
        <span aria-hidden="true">S</span>
      </IconButton>
    </AppThemeContext.Provider>,
  )

describe('IconButton', () => {
  it('adds subtle CSS-only press feedback to enabled buttons', () => {
    renderIconButton()

    const button = screen.getByRole('button', { name: 'Sync all windows' })

    expect(button.className).toContain(
      'transition-[color,background-color,transform]',
    )
    expect(button.className).toContain('active:scale-[0.97]')
    expect(button.className).toContain('motion-reduce:transition-none')
  })

  it('neutralizes the press transform for disabled buttons', () => {
    renderIconButton({ disabled: true })

    const button = screen.getByRole('button', { name: 'Sync all windows' })

    expect(button).toBeDisabled()
    expect(button.className).toContain('disabled:active:scale-100')
  })
})
