import React from 'react'
import {
  connectDropTarget,
  spy,
  shallow,
  stub,
  it,
  describe,
  expect
} from 'test'
import Paper from 'material-ui/Paper'
import Title from '../Title'
import Tabs from '../Tabs'
import Preview from 'components/Preview'
import Window, { windowTarget, collect } from '../index'
import { createMuiTheme } from 'material-ui/styles'

const theme = createMuiTheme()
const tabs = [{ id: 1 }, { id: 2 }]
const props = {
  connectDropTarget,
  dragStore: {
    drop: spy()
  },
  win: {
    tabs,
    showTabs: true
  },
  getScrollbars: spy(),
  dragPreview: 'preview node',
  width: '100%',
  theme
}

describe('Window', () => {
  it('render correct components', () => {
    const el = shallow(<Window.DecoratedComponent {...props} />)
    expect(el.find(Title).length).toBe(1)
    expect(el.find(Tabs).length).toBe(1)
    expect(el.find(Paper).length).toBe(1)
  })

  it('render error.light backgroundColor if canDrop is false', () => {
    const el = shallow(
      <Window.DecoratedComponent {...props} isDragging isOver canDrop={false} />
    )
    expect(el.find(Title).length).toBe(1)
    expect(el.find(Tabs).length).toBe(1)
    expect(el.find('div').props().style.backgroundColor).toBe(
      theme.palette.error.light
    )
  })

  it('render correct margin based on left & right', () => {
    let el = shallow(<Window.DecoratedComponent {...props} left />)
    expect(el.find('div').props().style.marginLeft).toBe('auto')
    expect(el.find('div').props().style.marginRight).toBeUndefined()
    el = shallow(<Window.DecoratedComponent {...props} right />)
    expect(el.find('div').props().style.marginLeft).toBeUndefined()
    expect(el.find('div').props().style.marginRight).toBe('auto')
    el = shallow(<Window.DecoratedComponent {...props} left right />)
    expect(el.find('div').props().style.marginLeft).toBe('auto')
    expect(el.find('div').props().style.marginRight).toBe('auto')
    el = shallow(<Window.DecoratedComponent {...props} />)
    expect(el.find('div').props().style.marginLeft).toBeUndefined()
    expect(el.find('div').props().style.marginRight).toBeUndefined()
  })

  it('render Preview based on canDrop & isOver', () => {
    let el = shallow(<Window.DecoratedComponent {...props} />)
    expect(el.find(Preview).length).toBe(0)
    el = shallow(<Window.DecoratedComponent {...props} isOver />)
    expect(el.find(Preview).length).toBe(0)
    el = shallow(<Window.DecoratedComponent {...props} canDrop />)
    expect(el.find(Preview).length).toBe(0)
    el = shallow(<Window.DecoratedComponent {...props} canDrop isOver />)
    expect(el.find(Preview).length).toBe(1)
  })

  it('render correct elevation based on lastFocused', () => {
    let el = shallow(<Window.DecoratedComponent {...props} />)
    expect(el.find(Paper).props().elevation).toBe(0)
    el = shallow(
      <Window.DecoratedComponent {...props} win={{ lastFocused: true }} />
    )
    expect(el.find(Paper).props().elevation).toBe(4)
  })
})

describe('windowTarget', () => {
  it('canDrop return props.win.canDrop', () => {
    expect(windowTarget.canDrop({ win: { canDrop: true } })).toBe(true)
    expect(windowTarget.canDrop({ win: { canDrop: false } })).toBe(false)
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
  })

  it('drop should call dragStore.drop if not didDrop', () => {
    const dragStore = { drop: spy() }
    expect(
      windowTarget.drop(
        {
          win: { tabs: ['t'] },
          dragStore
        },
        {
          didDrop () {
            return false
          }
        }
      )
    ).toBeUndefined()
    expect(dragStore.drop.callCount).toBe(1)
    expect(dragStore.drop.args[0]).toEqual(['t', false])
  })
})

describe('collect', () => {
  const dropTarget = stub().returns('dropTarget')
  const canDrop = stub().returns('canDrop')
  const getItem = stub().returns([])
  const isOver = stub().returns('isOver')
  expect(collect({ dropTarget }, { canDrop, getItem, isOver })).toEqual({
    connectDropTarget: 'dropTarget',
    canDrop: 'canDrop',
    isDragging: true,
    isOver: 'isOver'
  })
  getItem.returns('')
  expect(collect({ dropTarget }, { canDrop, getItem, isOver })).toEqual({
    connectDropTarget: 'dropTarget',
    canDrop: 'canDrop',
    isDragging: false,
    isOver: 'isOver'
  })
})
