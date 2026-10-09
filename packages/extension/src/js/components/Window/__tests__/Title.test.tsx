import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppThemeContext, lightAppTheme } from 'libs/appTheme'
import { StoreContext } from 'components/hooks/useStore'
import { ThemeContext } from 'components/hooks/useTheme'
import Title from '../Title'

jest.mock('../SelectAll', () => () => <div data-testid="select-all" />)
jest.mock('../WindowActionsMenu', () => () => (
  <button data-testid="window-actions" aria-label="Window actions" />
))
jest.mock(
  'components/CloseButton',
  () =>
    ({ tone = 'danger', 'aria-label': label, onClick }) => (
      <button
        data-testid="close"
        data-tone={tone}
        aria-label={label}
        onClick={onClick}
      />
    ),
)
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
  it.each(
    ['2 tabs', 'Collapse window', 'Window actions', 'Close window'].flatMap(
      (label) => [[label, false] as const, [label, true] as const],
    ),
  )(
    'syncs %s without overwriting an existing focus request (focused=%s)',
    (label, isFocused) => {
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
        isFocused,
        focusRequestId: 12,
        shouldMoveDomFocus: true,
        shouldRevealOnFocus: true,
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

      fireEvent.focus(screen.getByRole('button', { name: label }))

      const expectedCalls = isFocused
        ? []
        : [[win, { origin: 'keyboard', reveal: false, moveDomFocus: false }]]
      expect(focus.mock.calls).toEqual(expectedCalls)
      expect(win.focusRequestId).toBe(12)
      expect(win.shouldMoveDomFocus).toBe(true)
      expect(win.shouldRevealOnFocus).toBe(true)
    },
  )

  it('keeps collapse and close visible while removing direct sort and reload controls', () => {
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
      close: jest.fn(),
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
    expect(screen.getByRole('button', { name: 'Close window' })).toBeVisible()
    const collapse = screen.getByRole('button', { name: 'Collapse window' })
    expect(collapse).toBeVisible()
    expect(collapse).toHaveAttribute('aria-expanded', 'true')
    expect(collapse.style.backgroundColor).toBe('')
    fireEvent.mouseEnter(collapse)
    expect(collapse).toHaveStyle({
      backgroundColor: lightAppTheme.palette.action.hover,
    })
    fireEvent.mouseDown(collapse)
    fireEvent.mouseUp(collapse)
    fireEvent.click(collapse)
    expect(win.toggleHide).toHaveBeenCalledTimes(1)
    fireEvent.mouseLeave(collapse)
    expect(collapse.style.backgroundColor).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Close window' }))
    expect(win.close).toHaveBeenCalledTimes(1)
    fireEvent.mouseEnter(screen.getByTestId('window-title-8'))
    expect(
      screen.queryByRole('button', { name: 'Sort tabs' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Reload all tabs' }),
    ).not.toBeInTheDocument()
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

  it('offers an expanded-state label while the window is collapsed', () => {
    const win = {
      id: 11,
      tabs: [{ id: 1 }],
      invisibleTabs: [],
      hide: true,
      activate: jest.fn(),
      toggleHide: jest.fn(),
      setNodeRef: jest.fn(),
    } as any
    const store = {
      focusStore: { focus: jest.fn() },
      userStore: { uiPreset: 'modern' },
    } as any
    render(
      <StoreContext.Provider value={store}>
        <Title className="" win={win} />
      </StoreContext.Provider>,
    )
    const expand = screen.getByRole('button', { name: 'Expand window' })
    expect(expand).toBeVisible()
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    fireEvent.focus(expand)
    fireEvent.click(expand)
    expect(win.toggleHide).toHaveBeenCalledTimes(1)
    expect(store.focusStore.focus).toHaveBeenCalledWith(win, {
      origin: 'keyboard',
      reveal: false,
      moveDomFocus: false,
    })
  })

  it('keeps the select-all checkbox column flush with tab rows', () => {
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
      id: 10,
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

    const selectAll = screen.getByTestId('select-all')
    const titleButton = screen.getByRole('button', { name: '2 tabs' })
    const headerRow = selectAll.parentElement

    expect(headerRow).not.toHaveClass('pl-1')
    expect(titleButton).toHaveClass('pl-1')
  })
})
