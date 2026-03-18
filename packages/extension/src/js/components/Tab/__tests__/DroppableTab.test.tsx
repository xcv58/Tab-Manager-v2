import React from 'react'
import { render } from '@testing-library/react'
import { StoreContext } from 'components/hooks/useStore'
import DroppableTab from '../DroppableTab'

const mockUseDrop = jest.fn()
const mockDrop = jest.fn()

jest.mock('react-dnd', () => ({
  useDrop: (...args) => mockUseDrop(...args),
}))

jest.mock('../Tab', () => ({ className }) => (
  <div data-testid="tab-row" className={className} />
))

jest.mock('components/DropIndicator', () => ({ position }) => (
  <div data-testid={`drop-indicator-${position}`} />
))

describe('DroppableTab', () => {
  beforeEach(() => {
    mockDrop.mockClear()
    mockUseDrop.mockReset()
    mockUseDrop.mockReturnValue([{ canDrop: false, isOver: false }, mockDrop])
  })

  it('attaches the drop connector through the ref lifecycle', () => {
    const store = {
      dragStore: {
        drop: jest.fn(),
      },
    } as any
    const tab = {
      win: {
        canDrop: true,
      },
    } as any

    const { rerender } = render(
      <StoreContext.Provider value={store}>
        <DroppableTab tab={tab} />
      </StoreContext.Provider>,
    )

    expect(
      mockDrop.mock.calls.filter(([node]) => node instanceof HTMLDivElement),
    ).toHaveLength(1)

    rerender(
      <StoreContext.Provider value={store}>
        <DroppableTab tab={tab} />
      </StoreContext.Provider>,
    )

    expect(
      mockDrop.mock.calls.filter(([node]) => node instanceof HTMLDivElement),
    ).toHaveLength(1)
  })
})
