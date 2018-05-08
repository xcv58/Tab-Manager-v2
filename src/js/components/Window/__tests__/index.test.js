import React from 'react'
import { connectDropTarget, spy, shallow, it, describe, expect } from 'test'
import Paper from 'material-ui/Paper'
import Title from '../Title'
import Tabs from '../Tabs'
import Preview from 'components/Preview'
import Window from '../index'
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
    expect(el.find(Paper).props().elevation).toBe(2)
    el = shallow(
      <Window.DecoratedComponent {...props} win={{ lastFocused: true }} />
    )
    expect(el.find(Paper).props().elevation).toBe(16)
  })
})
