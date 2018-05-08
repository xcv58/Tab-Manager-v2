import React from 'react'
import { spy, shallow, expect, describe, it } from 'test'
import Tooltip from 'material-ui/Tooltip'
import Checkbox from 'material-ui/Checkbox'
import SelectAll from 'components/Window/SelectAll'

const id = 'id'
const selectAll = spy()
const unselectAll = spy()
const props = {
  tabStore: { selectAll, unselectAll },
  win: {
    id,
    allTabSelected: true,
    someTabSelected: false,
    disableSelectAll: false
  }
}

describe('SelectAll', () => {
  it('should render correct components', () => {
    const el = shallow(<SelectAll.wrappedComponent {...props} />)
    expect(el.find(Tooltip).length).toBe(1)
    expect(el.find(Checkbox).length).toBe(1)
  })

  it('should render Tooltip title based on allTabSelected', () => {
    let el = shallow(<SelectAll.wrappedComponent {...props} />)
    expect(el.find(Tooltip).length).toBe(1)
    expect(el.find(Tooltip).props().title).toBe('Unselect all tabs')
    el = shallow(
      <SelectAll.wrappedComponent {...props} win={{ allTabSelected: false }} />
    )
    expect(el.find(Tooltip).length).toBe(1)
    expect(el.find(Tooltip).props().title).toBe('Select all tabs')
  })

  it('should call tabStore.selectAll', () => {
    const el = shallow(<SelectAll.wrappedComponent {...props} />)
    const blur = spy()
    el.instance().onChange({ target: { blur } })
    expect(blur.calledOnce).toBe(true)
    expect(unselectAll.calledOnce).toBe(true)
  })

  it('should call tabStore.unselectAll', () => {
    const el = shallow(
      <SelectAll.wrappedComponent {...props} win={{ allTabSelected: false }} />
    )
    const blur = spy()
    el.instance().onChange({ target: { blur } })
    expect(blur.calledOnce).toBe(true)
    expect(selectAll.calledOnce).toBe(true)
  })
})
