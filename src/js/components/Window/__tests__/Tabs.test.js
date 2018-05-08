import React from 'react'
import {
  connectDropTarget,
  spy,
  stub,
  shallow,
  it,
  describe,
  expect
} from 'test'
import FlipMove from 'react-flip-move'
import DraggableTab from 'components/Tab/DraggableTab'
import Tabs from 'components/Window/Tabs'

const tabs = [{ id: 1 }, { id: 2 }]
const windowMounted = spy()
const props = {
  connectDropTarget,
  dragStore: {
    drop: spy()
  },
  windowStore: {
    windowMounted
  },
  win: {
    tabs,
    showTabs: true
  },
  getScrollbars: spy(),
  dragPreview: 'preview node'
}

describe('Tabs', () => {
  it('render correct components', () => {
    const el = shallow(<Tabs.wrappedComponent {...props} />)
    expect(el.find(FlipMove).length).toBe(1)
    expect(el.find(DraggableTab).length).toBe(2)
  })

  it('call requestAnimationFrame with windowStore.windowMounted', () => {
    const requestAnimationFrame = stub(window, 'requestAnimationFrame')
    shallow(<Tabs.wrappedComponent {...props} />)
    expect(requestAnimationFrame.callCount).toBe(1)
    expect(requestAnimationFrame.args[0]).toEqual([windowMounted])
  })
})
