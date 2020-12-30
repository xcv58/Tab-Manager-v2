import React from 'react'
import { spy } from 'sinon'
import { shallow } from 'enzyme'
import CloseButton from 'components/CloseButton'

const props = {
  onClick: spy(),
}

describe('CloseButton', () => {
  it('should render correct components', () => {
    const el = shallow(<CloseButton {...props} />)
    expect(el.find('button').length).toBe(1)
  })

  it('should call onClick', () => {
    const onClick = spy()
    const el = shallow(<CloseButton onClick={onClick} />)
    el.find('button').props().onClick()
    expect(onClick.callCount).toBe(1)
    el.find('button').props().onClick()
    expect(onClick.callCount).toBe(2)
  })
})
