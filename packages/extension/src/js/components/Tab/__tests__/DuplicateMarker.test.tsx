import React from 'react'
import { render, screen } from '@testing-library/react'
import { StoreContext } from 'components/hooks/useStore'
import { ThemeContext } from 'components/hooks/useTheme'
import DuplicateMarker from '../DuplicateMarker'

const renderMarker = (uiPreset: 'modern' | 'classic') => {
  const store = {
    userStore: {
      highlightDuplicatedTab: true,
      uiPreset,
    },
  } as any

  render(
    <StoreContext.Provider value={store}>
      <ThemeContext.Provider value={false}>
        <DuplicateMarker
          tab={
            {
              id: 1,
              isDuplicated: true,
              isFocused: false,
              isSelected: false,
            } as any
          }
        />
      </ThemeContext.Provider>
    </StoreContext.Provider>,
  )
}

describe('DuplicateMarker', () => {
  it('shows the duplicate marker in modern mode', () => {
    renderMarker('modern')

    expect(screen.getByTestId('tab-duplicate-marker-1')).toHaveStyle({
      opacity: '1',
    })
  })

  it('suppresses the duplicate marker in classic mode', () => {
    renderMarker('classic')

    expect(screen.getByTestId('tab-duplicate-marker-1')).toHaveStyle({
      opacity: '0',
    })
  })
})
