/* global expect, test */
import React from 'react'
import { connectDropTarget, spy, shallow } from 'test'
import Title from '../Title'
import Tabs from '../Tabs'
import Window from '../index'

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
  width: '100%'
}

test('Window should render correct components', () => {
  const el = shallow(<Window.DecoratedComponent {...props} />)
  expect(el.find(Title).length).toBe(1)
  expect(el.find(Tabs).length).toBe(1)
})
