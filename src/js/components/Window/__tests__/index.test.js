import React from 'react'
import test from 'ava'
import { spy, shallow } from 'test'
import { connectDropTarget } from 'libs/test'
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

test('Window should render correct components', t => {
  const el = shallow(
    <Window.DecoratedComponent {...props} />
  )
  t.is(el.find(Title).length, 1)
  t.is(el.find(FlipMove).length, 1)
  t.is(el.find(DraggableTab).length, tabs.length)
  t.is(el.find(DraggableTab).first().props().getWindowList, props.getWindowList)
  t.is(el.find(DraggableTab).first().props().dragPreview, props.dragPreview)
})
