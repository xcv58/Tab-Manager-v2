/* global expect, test */
import React from 'react'
import { spy, shallow } from 'test'
import Tooltip from 'material-ui/Tooltip'
import SortIcon from 'material-ui-icons/Sort'
import IconButton from 'material-ui/IconButton'
import Sort from '../Sort'

const id = 'id'
const sortTabs = spy()
const props = {
  arrangeStore: { sortTabs },
  win: { id }
}

test('Sort should call arrangeStore.sortTabs', () => {
  const el = shallow(<Sort.wrappedComponent {...props} />)
  expect(el.find(Tooltip).length).toBe(1)
  expect(el.find(SortIcon).length).toBe(1)
  expect(el.find(IconButton).length).toBe(1)
  el.find(IconButton).props().onClick()
  expect(sortTabs.calledOnce).toBe(true)
  expect(sortTabs.args).toEqual([ [ id ] ])
})
