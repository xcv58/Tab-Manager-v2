import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { StoreContext } from 'components/hooks/useStore'
import GroupRow from '../GroupRow'

jest.mock('react-dnd', () => ({
  useDrop: () => [{ canDrop: false, isOver: false }, jest.fn()],
}))
jest.mock('../GroupEditorPopover', () => () => null)
jest.mock('../GroupDragHandle', () => () => (
  <div data-testid="group-drag-handle" />
))
jest.mock('components/CloseButton', () => () => (
  <div data-testid="close-button" />
))
jest.mock('components/RowActionRail', () => ({ children }) => (
  <div>{children}</div>
))
jest.mock('components/RowActionSlot', () => ({ children }) => (
  <div>{children}</div>
))
jest.mock(
  'components/ControlIconButton',
  () =>
    ({ controlSize: _controlSize, ...props }) => (
      <button type="button" {...props} />
    ),
)
jest.mock('components/DropIndicator', () => () => null)

describe('GroupRow', () => {
  it('keeps native toggle focus while syncing logical focus state', () => {
    const focus = jest.fn()
    const groupRow = {
      isFocused: false,
      focusRequestId: 0,
      shouldMoveDomFocus: true,
      shouldRevealOnFocus: false,
      setNodeRef: jest.fn(),
      groupId: 100,
      windowId: 1,
    }
    const store = {
      tabGroupStore: {
        getTabGroup: jest.fn(() => ({
          id: 100,
          color: 'blue',
          title: 'My group',
          collapsed: false,
        })),
        getTabsForGroup: jest.fn(() => [{ id: 1 }, { id: 2 }]),
        toggleCollapsed: jest.fn(),
        canMutateGroups: jest.fn(() => true),
      },
      searchStore: {
        _query: '',
      },
      windowStore: {
        getDuplicateTabsToRemoveCount: jest.fn(() => 0),
        windows: [{ id: 1, canDrop: true }],
      },
      dragStore: {
        dragging: false,
        dragSource: null,
        dropAt: jest.fn(),
      },
      focusStore: {
        focus,
        shouldRevealNode: jest.fn(() => false),
      },
    } as any
    const row = {
      kind: 'group' as const,
      groupId: 100,
      windowId: 1,
      color: 'blue',
      collapsed: false,
      tabIds: [1, 2],
      matchedCount: 2,
    }
    const win = {
      id: 1,
      getGroupRow: jest.fn(() => groupRow),
    } as any

    render(
      <StoreContext.Provider value={store}>
        <ThemeProvider theme={createTheme()}>
          <GroupRow row={row} win={win} />
        </ThemeProvider>
      </StoreContext.Provider>,
    )

    fireEvent.focus(screen.getByTestId('tab-group-toggle-100'))

    expect(focus).toHaveBeenCalledWith(groupRow, {
      origin: 'keyboard',
      reveal: false,
      moveDomFocus: false,
    })
  })
})
