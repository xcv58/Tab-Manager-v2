import { spy, stub } from 'sinon'
import {
  tabDropCollect,
  windowTarget,
  titleTarget,
  tabSource,
  tabTarget
} from '../react-dnd'

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

  it('drop should do nothing if no tab', () => {
    const dragStore = { drop: spy() }
    const props = {
      win: { tabs: [] },
      dragStore
    }
    const monitor = {
      didDrop () {
        return false
      }
    }
    expect(windowTarget.drop(props, monitor)).toBeUndefined()
    expect(dragStore.drop.callCount).toBe(0)

    dragStore.drop = spy()
    expect(titleTarget.drop(props, monitor)).toBeUndefined()
    expect(dragStore.drop.callCount).toBe(0)
  })
})

describe('tabTarget', () => {
  it('canDrop return tab.win.canDrop', () => {
    let props = { tab: { win: { canDrop: true } } }
    expect(tabTarget.canDrop(props)).toBe(true)
    props = { tab: { win: { canDrop: false } } }
    expect(tabTarget.canDrop(props)).toBe(false)
  })

  it('call drop with tab', () => {
    const drop = spy()
    const props = {
      tab: { id: 1 },
      dragStore: { drop }
    }
    tabTarget.drop(props)
    expect(drop.callCount).toBe(1)
    expect(drop.args[0]).toEqual([props.tab])
  })
})

describe('tabSource', () => {
  it('beginDrag call ', () => {
    const dragStart = spy()
    const props = {
      tab: { id: 1 },
      dragStore: { dragStart }
    }
    tabSource.beginDrag(props)
    expect(dragStart.callCount).toBe(1)
    expect(dragStart.args[0]).toEqual([props.tab])
  })

  it('endDrag call props.dragStore.dragEnd', () => {
    const dragEnd = spy()
    const props = { dragStore: { dragEnd } }
    tabSource.endDrag(props)
    expect(dragEnd.callCount).toBe(1)
    expect(dragEnd.args[0]).toEqual([])
  })

  it('isDragging return props.tab.isSelected', () => {
    let props = { tab: { isSelected: true } }
    expect(tabSource.isDragging(props)).toBe(true)
    props = { tab: { isSelected: false } }
    expect(tabSource.isDragging(props)).toBe(false)
  })
})
