import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { StoreContext } from 'components/hooks/useStore'
import { ThemeContext } from 'components/hooks/useTheme'
import Title from '../Title'

jest.mock('../SelectAll', () => () => <div data-testid="select-all" />)
jest.mock('../Sort', () => () => <div data-testid="sort" />)
jest.mock('../Reload', () => () => <div data-testid="reload" />)
jest.mock('../HideToggle', () => () => <div data-testid="hide-toggle" />)
jest.mock('components/CloseButton', () => () => <div data-testid="close" />)
jest.mock('components/RowActionRail', () => ({ children }) => (
  <div>{children}</div>
))
jest.mock('components/RowActionSlot', () => ({ children }) => (
  <div>{children}</div>
))

describe('Window Title', () => {
  it('keeps native button focus when the title button receives keyboard focus', () => {
    const focus = jest.fn()
    const store = {
      focusStore: {
        focus,
        shouldRevealNode: jest.fn(() => false),
      },
    } as any
    const win = {
      id: 7,
      tabs: [{ id: 1 }, { id: 2 }],
      activate: jest.fn(),
      invisibleTabs: [],
      reload: jest.fn(),
      hide: false,
      toggleHide: jest.fn(),
      isFocused: false,
      focusRequestId: 0,
      shouldMoveDomFocus: true,
      shouldRevealOnFocus: false,
      setNodeRef: jest.fn(),
    } as any

    render(
      <StoreContext.Provider value={store}>
        <ThemeProvider theme={createTheme()}>
          <ThemeContext.Provider value={false}>
            <Title className="" win={win} />
          </ThemeContext.Provider>
        </ThemeProvider>
      </StoreContext.Provider>,
    )

    fireEvent.focus(screen.getByRole('button', { name: '2 tabs' }))

    expect(focus).toHaveBeenCalledWith(win, {
      origin: 'keyboard',
      reveal: false,
      moveDomFocus: false,
    })
  })
})
