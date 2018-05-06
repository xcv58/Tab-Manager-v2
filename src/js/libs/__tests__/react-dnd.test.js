import { stub, describe, it, expect, spy } from 'test'
import { tabDropCollect, windowTarget, titleTarget } from 'libs/react-dnd'

describe('tabDropCollect', () => {
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
    expect(
      tabDropCollect({ dropTarget }, { canDrop, getItem, isOver })
    ).toEqual(expected)
  })

  it('return correct result', () => {
    getItem.returns('')
    expect(
      tabDropCollect({ dropTarget }, { canDrop, getItem, isOver })
    ).toEqual({
      ...expected,
      isDragging: false
    })
  })
})

describe('windowTarget && titleTarget', () => {
  it('canDrop return props.win.canDrop', () => {
    expect(windowTarget.canDrop({ win: { canDrop: true } })).toBe(true)
    expect(windowTarget.canDrop({ win: { canDrop: false } })).toBe(false)
    expect(titleTarget.canDrop({ win: { canDrop: true } })).toBe(true)
    expect(titleTarget.canDrop({ win: { canDrop: false } })).toBe(false)
  })

  it('drop return if monitor.didDrop', () => {
    expect(
      windowTarget.drop(
        {},
        {
          didDrop () {
            return true
          }
        }
      )
    ).toBeUndefined()
    expect(
      titleTarget.drop(
        {},
        {
          didDrop () {
            return true
          }
        }
      )
    ).toBeUndefined()
  })

  it('drop should call dragStore.drop if not didDrop', () => {
    const dragStore = { drop: spy() }
    const props = {
      win: { tabs: ['a', 'b', 'c', 'z'] },
      dragStore
    }
    const monitor = {
      didDrop () {
        return false
      }
    }
    expect(windowTarget.drop(props, monitor)).toBeUndefined()
    expect(dragStore.drop.callCount).toBe(1)
    expect(dragStore.drop.args[0]).toEqual(['z', false])

    dragStore.drop = spy()
    expect(titleTarget.drop(props, monitor)).toBeUndefined()
    expect(dragStore.drop.callCount).toBe(1)
    expect(dragStore.drop.args[0]).toEqual(['a', true])
  })
})
