import React from 'react'
import { spy } from 'sinon'
import { shallow } from 'enzyme'
import Tooltip from '@material-ui/core/Tooltip'
import SortIcon from '@material-ui/icons/Sort'
import IconButton from '@material-ui/core/IconButton'
import Sort from 'components/Window/Sort'
import * as StoreContext from 'components/hooks/useStore'

const id = 'id'
const sortTabs = spy()
const props = {
  win: { id },
}
const mockStore = {
  arrangeStore: { sortTabs },
}

test('Sort should call arrangeStore.sortTabs', () => {
  jest.spyOn(StoreContext, 'useStore').mockImplementation(() => mockStore)

  const el = shallow(<Sort {...props} />)
  expect(el.find(Tooltip).length).toBe(1)
  expect(el.find(SortIcon).length).toBe(1)
  expect(el.find(IconButton).length).toBe(1)
  el.find(IconButton).props().onClick()
  expect(sortTabs.calledOnce).toBe(true)
  expect(sortTabs.args).toEqual([[id]])
})
