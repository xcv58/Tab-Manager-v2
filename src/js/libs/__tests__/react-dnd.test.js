import { stub, describe, it, expect } from 'test'
import { collect } from 'libs/react-dnd'

describe('collect', () => {
  const dropTarget = stub().returns('dropTarget')
  const canDrop = stub().returns('canDrop')
  const getItem = stub().returns([])
  const isOver = stub().returns('isOver')
  const expected = {
    connectDropTarget: 'dropTarget',
    canDrop: 'canDrop',
    isDragging: true,
    isOver: 'isOver'
  }

  it('return isDragging based on monitor.getItem()', () => {
    expect(collect({ dropTarget }, { canDrop, getItem, isOver })).toEqual(
      expected
    )
  })

  it('return correct result', () => {
    getItem.returns('')
    expect(collect({ dropTarget }, { canDrop, getItem, isOver })).toEqual({
      ...expected,
      isDragging: false
    })
  })
})
