import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { StoreContext } from 'components/hooks/useStore'
import TabContent from '../TabContent'

jest.mock('components/Tab/Url', () => () => null)
jest.mock(
  'components/HighlightNode',
  () =>
    ({ text }) =>
      text,
)
jest.mock(
  'components/ui/Tooltip',
  () =>
    ({ children }) =>
      children,
)

describe('TabContent', () => {
  it('keeps native button focus when the tab content receives keyboard focus', () => {
    const focus = jest.fn()
    const store = {
      hoverStore: {
        hovered: true,
      },
      dragStore: {
        dragging: false,
      },
      userStore: {
        showUrl: false,
        highlightDuplicatedTab: false,
        uiPreset: 'modern',
      },
    } as any

    render(
      <StoreContext.Provider value={store}>
        <TabContent
          tab={{
            title: 'Keyboard focus tab',
            url: 'https://example.com',
            focus,
            activate: jest.fn(),
            isFocused: false,
            isHovered: false,
            duplicatedTabCount: 0,
            isDuplicated: false,
            isMatched: true,
            query: '',
            removing: false,
            remove: jest.fn(),
          }}
        />
      </StoreContext.Provider>,
    )

    fireEvent.focus(screen.getByRole('button', { name: 'Keyboard focus tab' }))

    expect(focus).toHaveBeenCalledWith({
      origin: 'keyboard',
      reveal: false,
      moveDomFocus: false,
    })
  })
})
