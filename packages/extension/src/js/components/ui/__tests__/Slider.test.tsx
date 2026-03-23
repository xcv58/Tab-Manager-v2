import React from 'react'
import { render, screen } from '@testing-library/react'
import { AppThemeContext, darkAppTheme } from 'libs/appTheme'
import Slider from '../Slider'

describe('Slider', () => {
  it('uses theme-bound colors in dark mode', () => {
    render(
      <AppThemeContext.Provider value={darkAppTheme}>
        <Slider
          value={50}
          min={0}
          max={100}
          onChange={() => {}}
          aria-label="Font size"
        />
      </AppThemeContext.Provider>,
    )

    const slider = screen.getByLabelText('Font size')
    const root = slider.parentElement as HTMLElement
    const divs = root.querySelectorAll('div')
    const rail = divs[1] as HTMLElement
    const activeTrack = divs[2] as HTMLElement
    const thumb = divs[3] as HTMLElement

    expect(rail).toHaveStyle(`background-color: rgba(181, 199, 230, 0.32)`)
    expect(activeTrack).toHaveStyle(
      `background-color: ${darkAppTheme.palette.primary.main}`,
    )
    expect(thumb).toHaveStyle(
      `background-color: ${darkAppTheme.palette.primary.main}`,
    )
  })
})
