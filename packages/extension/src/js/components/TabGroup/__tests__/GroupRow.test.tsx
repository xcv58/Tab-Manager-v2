import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppThemeContext, lightAppTheme } from 'libs/appTheme'
import { StoreContext } from 'components/hooks/useStore'
import GroupRow from '../GroupRow'

const mockUseDrop = jest.fn()
const mockDrop = jest.fn()
let lastDropSpec: any = null

jest.mock('react-dnd', () => ({
  useDrop: (...args) => mockUseDrop(...args),
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

const mockHeaderRect = (node: HTMLDivElement) => {
  Object.defineProperty(node, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      top: 0,
      left: 0,
      right: 200,
      bottom: 40,
      width: 200,
      height: 40,
      x: 0,
      y: 0,
      toJSON: () => {},
    }),
  })
}

const renderGroupRow = (
  dragSource: 'tab-row' | 'group-header',
  dropAt: any,
) => {
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
      getTabsForGroup: jest.fn(() => [
        { id: 1, index: 0 },
        { id: 2, index: 1 },
      ]),
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
      dragging: true,
      dragSource,
      dropAt,
    },
    focusStore: {
      focus: jest.fn(),
      shouldRevealNode: jest.fn(() => false),
    },
    userStore: {
      uiPreset: 'modern',
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
      <AppThemeContext.Provider value={lightAppTheme}>
        <GroupRow row={row} win={win} />
      </AppThemeContext.Provider>
    </StoreContext.Provider>,
  )

  const dropNode = mockDrop.mock.calls[0][0] as HTMLDivElement
  mockHeaderRect(dropNode)
  return { groupRow, dropNode, dropAt }
}

describe('GroupRow', () => {
  beforeEach(() => {
    mockDrop.mockClear()
    mockUseDrop.mockReset()
    lastDropSpec = null
    mockUseDrop.mockImplementation((spec) => {
      lastDropSpec = spec
      return [{ canDrop: true, isOver: false }, mockDrop]
    })
  })

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
      userStore: {
        uiPreset: 'modern',
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
        <AppThemeContext.Provider value={lightAppTheme}>
          <GroupRow row={row} win={win} />
        </AppThemeContext.Provider>
      </StoreContext.Provider>,
    )

    fireEvent.focus(screen.getByTestId('tab-group-toggle-100'))

    expect(focus).toHaveBeenCalledWith(groupRow, {
      origin: 'keyboard',
      reveal: false,
      moveDomFocus: false,
    })
  })

  it('treats centered group-header drops as explicit merge intent', () => {
    const dropAt = jest.fn()
    renderGroupRow('tab-row', dropAt)

    expect(lastDropSpec).not.toBeNull()
    lastDropSpec.drop(
      {},
      {
        didDrop: () => false,
        getClientOffset: () => ({ x: 20, y: 25 }),
      },
    )

    expect(dropAt).toHaveBeenCalledWith({
      windowId: 1,
      index: 0,
      targetGroupId: 100,
      before: true,
      source: 'group-header',
    })
  })

  it('keeps group-header before-zone drops separate', () => {
    const dropAt = jest.fn()
    renderGroupRow('group-header', dropAt)

    expect(lastDropSpec).not.toBeNull()
    lastDropSpec.drop(
      {},
      {
        didDrop: () => false,
        getClientOffset: () => ({ x: 20, y: 1 }),
      },
    )

    expect(dropAt).toHaveBeenCalledWith({
      windowId: 1,
      index: 0,
      forceUngroup: false,
      source: 'group-header',
    })
  })
})
