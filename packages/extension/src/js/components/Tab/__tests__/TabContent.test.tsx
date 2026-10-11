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
jest.mock('components/ui/Tooltip', () => ({ children, title }) => (
  <>
    {children}
    {title}
  </>
))

describe('TabContent', () => {
  it('limits URL presentation without changing the URL and restores the full display', () => {
    const url = `https://example.com/?data=${'long-query-value'.repeat(100)}`
    const userStore = {
      showUrl: false,
      highlightDuplicatedTab: false,
      uiPreset: 'modern',
      tabTooltipUrlLines: 3,
    } as any
    const store = {
      userStore,
      hoverStore: { hovered: true },
      dragStore: { dragging: false },
    } as any
    const tab = {
      title: 'Long URL tab',
      url,
      activate: jest.fn(),
      focus: jest.fn(),
      isFocused: false,
      isHovered: true,
      duplicatedTabCount: 0,
      isDuplicated: false,
      isMatched: true,
      query: '',
      removing: false,
      remove: jest.fn(),
    } as any
    const { unmount } = render(
      <StoreContext.Provider value={store}>
        <TabContent tab={tab} />
      </StoreContext.Provider>,
    )
    expect(screen.getByTestId('tab-tooltip-url').textContent).toBe(url)
    expect(screen.getByTestId('tab-tooltip-url')).toHaveClass('line-clamp-3')
    expect(tab.url).toBe(url)
    unmount()
    userStore.tabTooltipUrlLines = 'full'
    render(
      <StoreContext.Provider value={store}>
        <TabContent tab={tab} />
      </StoreContext.Provider>,
    )
    expect(screen.getByTestId('tab-tooltip-url').textContent).toBe(url)
    expect(screen.getByTestId('tab-tooltip-url')).not.toHaveClass(
      'line-clamp-3',
    )
  })

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
