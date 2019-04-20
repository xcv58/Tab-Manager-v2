import React from 'react'
import { spy } from 'sinon'
import { shallow } from 'enzyme'
import Tooltip from '@material-ui/core/Tooltip'
import SortIcon from '@material-ui/icons/Sort'
import IconButton from '@material-ui/core/IconButton'
import Sort from 'components/Window/Sort'

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
  el.find(IconButton)
    .props()
    .onClick()
  expect(sortTabs.calledOnce).toBe(true)
  expect(sortTabs.args).toEqual([[id]])
})
