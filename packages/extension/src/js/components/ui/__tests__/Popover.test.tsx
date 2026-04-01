import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const setViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  })
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

  it('keeps a wide popover within the viewport near the bottom-right corner', async () => {
    setViewportSize(360, 240)
    const anchorEl = createAnchorEl()
    anchorEl.getBoundingClientRect = () =>
      ({
        x: 300,
        y: 176,
        top: 176,
        left: 300,
        bottom: 204,
        right: 328,
        width: 28,
        height: 28,
        toJSON: () => ({}),
      }) as DOMRect

    render(
      <AppThemeContext.Provider value={darkAppTheme}>
        <Popover
          open
          anchorEl={anchorEl}
          onClose={() => {}}
          data-testid="test-popover"
          style={{ width: 220 }}
        >
          <div>Popover content</div>
        </Popover>
      </AppThemeContext.Provider>,
    )

    const popover = await screen.findByTestId('test-popover')
    jest.spyOn(popover, 'getBoundingClientRect').mockReturnValue({
      x: 124,
      y: 84,
      top: 84,
      left: 124,
      bottom: 224,
      right: 344,
      width: 220,
      height: 140,
      toJSON: () => ({}),
    } as DOMRect)

    fireEvent(window, new Event('resize'))

    await waitFor(() => {
      expect(popover).toHaveStyle('left: 124px')
      expect(popover).toHaveStyle('top: 84px')
    })

    anchorEl.remove()
  })
})
