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
      const store = {
        dragStore: { moveSelectedTabsToWindowEdge },
        tabStore: { selection: new Map() },
        userStore: { uiPreset: 'modern', increaseContrast: false },
      } as any
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
    'sends the allowed or blocked destination to the drag badge in $mode theme',
    (theme) => {
      const store = {
        dragStore: { setDropPreviewTarget: jest.fn() },
        tabStore: { selection: new Map() },
        userStore: { uiPreset: 'modern', increaseContrast: false },
      } as any
      mockUseDrop.mockImplementation((spec) => {
        lastDropSpec = spec
        return [{ canDrop: spec.canDrop(), isOver: true }, jest.fn()]
      })
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

      lastDropSpec.hover({}, { getHandlerId: () => 'header-end' })
      expect(store.dragStore.setDropPreviewTarget).toHaveBeenLastCalledWith({
        targetId: 'header-end',
        destination: 'end',
        blockedHint: undefined,
      })
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      expect(screen.getByTestId('window-header-drop-end-7').textContent).toBe(
        '',
      )

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
      lastDropSpec.hover({}, { getHandlerId: () => 'header-end' })
      expect(store.dragStore.setDropPreviewTarget).toHaveBeenLastCalledWith({
        targetId: 'header-end',
        destination: 'end',
        blockedHint: 'Cannot move tabs to this window',
      })
      expect(screen.getByTestId('window-header-drop-end-7')).toHaveStyle({
        cursor: 'not-allowed',
        opacity: '0.5',
      })
    },
  )

  it('shows both header halves only during a drag and retains the top insertion strip', () => {
    const store = {
      dragStore: observable({ dragging: false }),
      tabStore: { selection: new Map() },
      userStore: { uiPreset: 'modern', increaseContrast: false },
    } as any
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

  it.each([lightAppTheme, darkAppTheme])(
    'mutes an incompatible private destination and explains why in $mode theme',
    (theme) => {
      const store = {
        dragStore: { setDropPreviewTarget: jest.fn() },
        tabStore: { selection: new Map([[1, { id: 1, incognito: false }]]) },
        userStore: { uiPreset: 'modern', increaseContrast: false },
      } as any
      mockUseDrop.mockImplementation((spec) => {
        lastDropSpec = spec
        return [{ canDrop: spec.canDrop(), isOver: true }, jest.fn()]
      })
      render(
        <StoreContext.Provider value={store}>
          <AppThemeContext.Provider value={theme}>
            <HeaderDropTarget
              win={{ id: 7, canDrop: true, incognito: true } as any}
              position="beginning"
            />
          </AppThemeContext.Provider>
        </StoreContext.Provider>,
      )

      expect(lastDropSpec.canDrop()).toBe(false)
      lastDropSpec.hover({}, { getHandlerId: () => 'private-header' })
      expect(store.dragStore.setDropPreviewTarget).toHaveBeenCalledWith({
        targetId: 'private-header',
        destination: 'beginning',
        blockedHint: 'Cannot move tabs between regular and private windows',
      })
      expect(screen.getByTestId('window-header-drop-beginning-7')).toHaveStyle({
        cursor: 'not-allowed',
        opacity: '0.5',
      })
      store.tabStore.selection.set(1, { id: 1, incognito: true })
      expect(lastDropSpec.canDrop()).toBe(true)
    },
  )
})
