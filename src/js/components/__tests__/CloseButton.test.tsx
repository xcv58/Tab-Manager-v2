import React from 'react'
import { spy } from 'sinon'
import { shallow } from 'enzyme'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from '@material-ui/core/IconButton'
import CloseButton from 'components/CloseButton'

const props = {
  onClick: spy()
}

describe('CloseButton', () => {
  it('should render correct components', () => {
    const el = shallow(<CloseButton {...props} />).dive()
    expect(el.find(IconButton).length).toBe(1)
    expect(el.find(CloseIcon).length).toBe(1)
  })

  it('should call onClick', () => {
    const onClick = spy()
    const el = shallow(<CloseButton onClick={onClick} />).dive()
    el.find(IconButton)
      .props()
      .onClick()
    expect(onClick.callCount).toBe(1)
    el.find(IconButton)
      .props()
      .onClick()
    expect(onClick.callCount).toBe(2)
  })
})
