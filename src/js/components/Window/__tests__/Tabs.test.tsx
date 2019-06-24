import React from 'react'
import { connectDropTarget } from 'test'
import { spy, stub } from 'sinon'
import { shallow } from 'enzyme'
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
    const el = shallow(<Tabs {...props} />)
    expect(el.find(FlipMove).length).toBe(1)
    expect(el.find(DraggableTab).length).toBe(2)
  })

  it('call requestAnimationFrame with windowStore.windowMounted', () => {
    const requestAnimationFrame = stub(window, 'requestAnimationFrame')
    const el = shallow(<Tabs {...props} />)
    // TODO: trigger useEffect, it's blocked by https://github.com/airbnb/enzyme/issues/2086
    el.update()
    expect(requestAnimationFrame.callCount).toBe(1)
    expect(requestAnimationFrame.args[0]).toEqual([windowMounted])
  })
})
