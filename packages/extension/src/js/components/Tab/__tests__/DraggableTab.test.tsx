import React from 'react'
import { render } from '@testing-library/react'
import { StoreContext } from 'components/hooks/useStore'
import DraggableTab from '../DraggableTab'

const mockUseDrag = jest.fn()
const mockDrag = jest.fn()
const mockConnectDragPreview = jest.fn()

jest.mock('react-dnd', () => ({
  useDrag: (...args) => mockUseDrag(...args),
}))

jest.mock('../DroppableTab', () => () => <div data-testid="droppable-tab" />)

describe('DraggableTab', () => {
  beforeEach(() => {
    mockDrag.mockClear()
    mockConnectDragPreview.mockClear()
    mockUseDrag.mockReset()
    mockUseDrag.mockReturnValue([
      { isDragging: false },
      mockDrag,
      mockConnectDragPreview,
    ])
  })

  it('connects the empty drag preview only when the connector changes', () => {
    const store = {
      dragStore: {
        dragStartTab: jest.fn(),
        dragEnd: jest.fn(),
      },
    } as any
    const tab = {
      id: 1,
      isSelected: false,
    } as any

    const { rerender } = render(
      <StoreContext.Provider value={store}>
        <DraggableTab tab={tab} />
      </StoreContext.Provider>,
    )

    expect(mockConnectDragPreview).toHaveBeenCalledTimes(1)

    rerender(
      <StoreContext.Provider value={store}>
        <DraggableTab tab={tab} />
      </StoreContext.Provider>,
    )

    expect(mockConnectDragPreview).toHaveBeenCalledTimes(1)
  })

  it('does not treat the drag preview connector result as an effect cleanup', () => {
    mockConnectDragPreview.mockReturnValue({})

    const store = {
      dragStore: {
        dragStartTab: jest.fn(),
        dragEnd: jest.fn(),
      },
    } as any
    const tab = {
      id: 1,
      isSelected: false,
    } as any

    const { unmount } = render(
      <StoreContext.Provider value={store}>
        <DraggableTab tab={tab} />
      </StoreContext.Provider>,
    )

    expect(() => unmount()).not.toThrow()
  })
})
