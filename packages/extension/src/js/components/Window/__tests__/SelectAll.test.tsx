import React from 'react'
import { shallow } from 'enzyme'
import Tooltip from '@material-ui/core/Tooltip'
import Checkbox from '@material-ui/core/Checkbox'
import SelectAll from 'components/Window/SelectAll'

const id = 'id'
const toggleSelectAll = jest.fn()
const props = {
  win: {
    id,
    toggleSelectAll,
    allTabSelected: true,
    someTabSelected: false,
    disableSelectAll: false,
  },
}

describe('SelectAll', () => {
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

  it('should call toggleSelectAll when click', () => {
    const el = shallow(<SelectAll {...props} />)
    const blur = jest.fn()
    el.find(Checkbox).props().onChange({ target: { blur } })
    expect(blur.mock.calls.length).toBe(1)
    expect(toggleSelectAll.mock.calls.length).toBe(1)
  })
})
