import React from 'react'
import { render, screen } from '@testing-library/react'
import { AppThemeContext, darkAppTheme } from 'libs/appTheme'
import Popover from '../Popover'

const createAnchorEl = () => {
  const anchorEl = document.createElement('button')
  anchorEl.textContent = 'Open popover'
  anchorEl.getBoundingClientRect = () =>
    ({
      x: 24,
      y: 48,
      top: 48,
      left: 24,
      bottom: 88,
      right: 144,
      width: 120,
      height: 40,
      toJSON: () => ({}),
    }) as DOMRect
  document.body.appendChild(anchorEl)
  return anchorEl
}

describe('Popover', () => {
  it('uses theme surface and text colors in dark mode', async () => {
    const anchorEl = createAnchorEl()

    render(
      <AppThemeContext.Provider value={darkAppTheme}>
        <Popover
          open
          anchorEl={anchorEl}
          onClose={() => {}}
          data-testid="test-popover"
        >
          <div>Popover content</div>
        </Popover>
      </AppThemeContext.Provider>,
    )

    expect(await screen.findByTestId('test-popover')).toHaveStyle(`
      background-color: ${darkAppTheme.palette.background.paper};
      color: ${darkAppTheme.palette.text.primary};
    `)

    anchorEl.remove()
  })
})
