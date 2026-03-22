import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppThemeContext, lightAppTheme } from 'libs/appTheme'
import { StoreContext } from 'components/hooks/useStore'
import { ThemeContext } from 'components/hooks/useTheme'
import Title from '../Title'

jest.mock('../SelectAll', () => () => <div data-testid="select-all" />)
jest.mock('../Sort', () => () => <div data-testid="sort" />)
jest.mock('../Reload', () => () => <div data-testid="reload" />)
jest.mock('../HideToggle', () => () => <div data-testid="hide-toggle" />)
jest.mock('components/CloseButton', () => ({ tone = 'danger' }) => (
  <div data-testid="close" data-tone={tone} />
))
jest.mock('components/RowActionRail', () => ({ children }) => (
  <div>{children}</div>
))
jest.mock(
  'components/RowActionSlot',
  () =>
    ({ children, visible = true }) =>
      visible ? <div>{children}</div> : null,
)

describe('Window Title', () => {
  it('keeps native button focus when the title button receives keyboard focus', () => {
    const focus = jest.fn()
    const store = {
      focusStore: {
        focus,
        shouldRevealNode: jest.fn(() => false),
      },
      userStore: {
        uiPreset: 'modern',
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
        <AppThemeContext.Provider value={lightAppTheme}>
          <ThemeContext.Provider value={false}>
            <Title className="" win={win} />
          </ThemeContext.Provider>
        </AppThemeContext.Provider>
      </StoreContext.Provider>,
    )

    fireEvent.focus(screen.getByRole('button', { name: '2 tabs' }))

    expect(focus).toHaveBeenCalledWith(win, {
      origin: 'keyboard',
      reveal: false,
      moveDomFocus: false,
    })
  })

  it('keeps the window close control visible with the shared close tone', () => {
    const store = {
      focusStore: {
        focus: jest.fn(),
        shouldRevealNode: jest.fn(() => false),
      },
      userStore: {
        uiPreset: 'modern',
      },
    } as any
    const win = {
      id: 8,
      tabs: [{ id: 1 }],
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
        <AppThemeContext.Provider value={lightAppTheme}>
          <ThemeContext.Provider value={false}>
            <Title className="" win={win} />
          </ThemeContext.Provider>
        </AppThemeContext.Provider>
      </StoreContext.Provider>,
    )

    expect(screen.getByTestId('close')).toHaveAttribute('data-tone', 'danger')
    expect(screen.queryByTestId('reload')).not.toBeInTheDocument()
  })

  it('removes the divider below the window title in classic mode', () => {
    const store = {
      focusStore: {
        focus: jest.fn(),
        shouldRevealNode: jest.fn(() => false),
      },
      userStore: {
        uiPreset: 'classic',
      },
    } as any
    const win = {
      id: 9,
      tabs: [{ id: 1 }],
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
        <AppThemeContext.Provider value={lightAppTheme}>
          <ThemeContext.Provider value={false}>
            <Title className="" win={win} />
          </ThemeContext.Provider>
        </AppThemeContext.Provider>
      </StoreContext.Provider>,
    )

    expect(screen.getByTestId('window-title-9')).toHaveStyle({
      borderBottomStyle: 'none',
    })
  })
})
