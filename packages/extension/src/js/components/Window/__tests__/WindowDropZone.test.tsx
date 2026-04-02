import React from 'react'
import { render } from '@testing-library/react'
import { StoreContext } from 'components/hooks/useStore'
import WindowDropZone from '../WindowDropZone'

const mockUseDrop = jest.fn()
const mockDrop = jest.fn()
let lastDropSpec: any = null

jest.mock('react-dnd', () => ({
  useDrop: (...args) => mockUseDrop(...args),
}))

describe('WindowDropZone', () => {
  beforeEach(() => {
    mockDrop.mockClear()
    mockUseDrop.mockReset()
    lastDropSpec = null
    mockUseDrop.mockImplementation((spec) => {
      lastDropSpec = spec
      return [{ canDrop: false, isOver: false }, mockDrop]
    })
  })

  it('preserves group-header drags but keeps tab-row drags ungrouped', () => {
    const dragStore = {
      dragSource: 'group-header',
      dropAt: jest.fn(),
    }
    const win = {
      id: 7,
      canDrop: true,
      tabs: [{ id: 1 }, { id: 2 }],
    } as any
    const store = {
      dragStore,
    } as any

    const { rerender } = render(
      <StoreContext.Provider value={store}>
        <WindowDropZone win={win} position="bottom" />
      </StoreContext.Provider>,
    )

    expect(lastDropSpec).not.toBeNull()
    lastDropSpec.drop({}, { didDrop: () => false })
    expect(dragStore.dropAt).toHaveBeenCalledWith({
      windowId: 7,
      index: 2,
      forceUngroup: false,
      source: 'window-zone',
    })

    dragStore.dropAt.mockClear()
    dragStore.dragSource = 'tab-row'

    rerender(
      <StoreContext.Provider value={store}>
        <WindowDropZone win={win} position="bottom" />
      </StoreContext.Provider>,
    )

    expect(lastDropSpec).not.toBeNull()
    lastDropSpec.drop({}, { didDrop: () => false })
    expect(dragStore.dropAt).toHaveBeenCalledWith({
      windowId: 7,
      index: 2,
      forceUngroup: true,
      source: 'window-zone',
    })
  })
})
