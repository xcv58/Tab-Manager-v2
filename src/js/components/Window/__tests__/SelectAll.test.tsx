import React from 'react'
import { spy } from 'sinon'
import { shallow } from 'enzyme'
import Tooltip from '@material-ui/core/Tooltip'
import Checkbox from '@material-ui/core/Checkbox'
import SelectAll from 'components/Window/SelectAll'
import * as StoreContext from 'components/StoreContext'

const id = 'id'
const selectAll = spy()
const unselectAll = spy()
const props = {
  win: {
    id,
    allTabSelected: true,
    someTabSelected: false,
    disableSelectAll: false
  }
}

const mockStore = {
  tabStore: { selectAll, unselectAll }
}

describe('SelectAll', () => {
  beforeEach(() => {
    jest.spyOn(StoreContext, 'useStore').mockImplementation(() => mockStore)
  })

  it('should render correct components', () => {
    const el = shallow(<SelectAll {...props} />)
    expect(el.find(Tooltip).length).toBe(1)
    expect(el.find(Checkbox).length).toBe(1)
  })

  it('should render Tooltip title based on allTabSelected', () => {
    let el = shallow(<SelectAll {...props} />)
    expect(el.find(Tooltip).length).toBe(1)
    expect(el.find(Tooltip).props().title).toBe('Unselect all tabs')
    el = shallow(<SelectAll {...props} win={{ allTabSelected: false }} />)
    expect(el.find(Tooltip).length).toBe(1)
    expect(el.find(Tooltip).props().title).toBe('Select all tabs')
  })

  it('should call tabStore.selectAll', () => {
    const el = shallow(<SelectAll {...props} />)
    const blur = spy()
    el.find(Checkbox)
      .props()
      .onChange({ target: { blur } })
    expect(blur.calledOnce).toBe(true)
    expect(unselectAll.calledOnce).toBe(true)
  })

  it('should call tabStore.unselectAll', () => {
    const el = shallow(<SelectAll {...props} win={{ allTabSelected: false }} />)
    const blur = spy()
    el.find(Checkbox)
      .props()
      .onChange({ target: { blur } })
    expect(blur.calledOnce).toBe(true)
    expect(selectAll.calledOnce).toBe(true)
  })
})
