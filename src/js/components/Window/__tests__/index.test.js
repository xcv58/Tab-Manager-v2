/* global expect, test */
import React from 'react'
import { connectDropTarget, spy, shallow } from 'test'
import FlipMove from 'react-flip-move'
import DraggableTab from 'components/Tab/DraggableTab'
import Title from '../Title'
import Window from '../index'

const tabs = [ { id: 1 }, { id: 2 } ]
const props = {
  connectDropTarget,
  dragStore: {
    drop: spy()
  },
  win: { tabs },
  getWindowList: spy(),
  dragPreview: 'preview node',
  width: '100%'
}

test('Window should render correct components', () => {
  const el = shallow(
    <Window.DecoratedComponent {...props} />
  )
  expect(el.find(Title).length).toBe(1)
  expect(el.find(FlipMove).length).toBe(1)
  expect(el.find(DraggableTab).length).toBe(tabs.length)
  expect(el.find(DraggableTab).first().props().getWindowList).toBe(props.getWindowList)
  expect(el.find(DraggableTab).first().props().dragPreview).toBe(props.dragPreview)
})
