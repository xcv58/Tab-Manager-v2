import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { observable, runInAction } from 'mobx'
import { StoreContext } from 'components/hooks/useStore'
import { AppThemeContext, lightAppTheme, darkAppTheme } from 'libs/appTheme'
import HeaderDropTarget from '../HeaderDropTarget'
import DroppableTitle from '../DroppableTitle'

const mockUseDrop = jest.fn()
let lastDropSpec: any

jest.mock('react-dnd', () => ({ useDrop: (...args) => mockUseDrop(...args) }))
jest.mock('../Title', () => () => <div data-testid="normal-header" />)
jest.mock('../WindowDropZone', () => () => (
  <div data-testid="top-insertion-strip" />
))

describe('window header drop targets', () => {
  beforeEach(() => {
    mockUseDrop.mockReset().mockImplementation((spec) => {
      lastDropSpec = spec
      return [{ canDrop: true, isOver: false }, jest.fn()]
    })
  })

  it.each(['beginning', 'end'] as const)(
    'moves to %s and ignores an already-handled drop',
    (position) => {
      const moveSelectedTabsToWindowEdge = jest.fn()
      const store = { dragStore: { moveSelectedTabsToWindowEdge } } as any
      const win = { id: 7, canDrop: true } as any
      render(
        <StoreContext.Provider value={store}>
          <HeaderDropTarget win={win} position={position} />
        </StoreContext.Provider>,
      )

      expect(lastDropSpec.canDrop()).toBe(true)
      lastDropSpec.drop({}, { didDrop: () => false })
      expect(moveSelectedTabsToWindowEdge).toHaveBeenCalledWith(7, position)
      lastDropSpec.drop({}, { didDrop: () => true })
      expect(moveSelectedTabsToWindowEdge).toHaveBeenCalledTimes(1)
      win.canDrop = false
      expect(lastDropSpec.canDrop()).toBe(false)
    },
  )

  it.each([lightAppTheme, darkAppTheme])(
    'highlights only the hovered, allowed half in $mode theme',
    (theme) => {
      const store = { dragStore: {} } as any
      mockUseDrop.mockReturnValue([{ canDrop: true, isOver: true }, jest.fn()])
      const { rerender } = render(
        <StoreContext.Provider value={store}>
          <AppThemeContext.Provider value={theme}>
            <HeaderDropTarget
              win={{ id: 7, canDrop: true } as any}
              position="end"
            />
          </AppThemeContext.Provider>
        </StoreContext.Provider>,
      )

      expect(screen.getByTestId('window-header-drop-end-7')).toHaveStyle({
        backgroundColor: theme.palette.action.selected,
        boxShadow: `inset 0 0 0 2px ${theme.palette.primary.main}`,
      })
      expect(screen.getByText('Move to end')).toBeInTheDocument()

      mockUseDrop.mockReturnValue([{ canDrop: false, isOver: true }, jest.fn()])
      rerender(
        <StoreContext.Provider value={store}>
          <AppThemeContext.Provider value={theme}>
            <HeaderDropTarget
              win={{ id: 7, canDrop: false } as any}
              position="end"
            />
          </AppThemeContext.Provider>
        </StoreContext.Provider>,
      )
      expect(screen.getByText('End')).toBeInTheDocument()
      expect(screen.getByTestId('window-header-drop-end-7')).toHaveStyle({
        cursor: 'not-allowed',
        boxShadow: `inset 0 0 0 1px ${theme.palette.divider}`,
      })
    },
  )

  it('shows both header halves only during a drag and retains the top insertion strip', () => {
    const store = { dragStore: observable({ dragging: false }) } as any
    const win = { id: 7, canDrop: true } as any
    render(
      <StoreContext.Provider value={store}>
        <DroppableTitle win={win} />
      </StoreContext.Provider>,
    )
    expect(
      screen.queryByTestId('window-header-drop-targets-7'),
    ).not.toBeInTheDocument()

    act(() => {
      runInAction(() => {
        store.dragStore.dragging = true
      })
    })
    expect(
      screen.getByTestId('window-header-drop-beginning-7'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('window-header-drop-end-7')).toBeInTheDocument()
    expect(screen.getByTestId('top-insertion-strip')).toBeInTheDocument()

    act(() => {
      runInAction(() => {
        store.dragStore.dragging = false
      })
    })
    expect(
      screen.queryByTestId('window-header-drop-targets-7'),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('normal-header')).toBeInTheDocument()
  })
})
