import React from 'react'
import { spy, shallow, expect, describe, it } from 'test'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from 'material-ui/IconButton'
import { createMuiTheme } from 'material-ui/styles'
import CloseButton from '../CloseButton'

const theme = createMuiTheme()
const props = {
  theme,
  faked: false,
  dragStore: { dragging: false },
  tab: { isHovered: true, removing: false }
}

describe('CloseButton', () => {
  it('should render correct components', () => {
    const el = shallow(<CloseButton.wrappedComponent {...props} />)
    expect(el.find(IconButton).length).toBe(1)
    expect(el.find(CloseIcon).length).toBe(1)
  })

  it('should render null', () => {
    let el = shallow(<CloseButton.wrappedComponent {...props} faked />)
    expect(el.getElement()).toBe(null)
    el = shallow(
      <CloseButton.wrappedComponent {...props} dragStore={{ dragging: true }} />
    )
    expect(el.getElement()).toBe(null)
    el = shallow(
      <CloseButton.wrappedComponent {...props} tab={{ isHovered: false }} />
    )
    expect(el.getElement()).toBe(null)
  })

  it('should has onClick', () => {
    const remove = spy()
    props.tab.remove = remove
    const el = shallow(<CloseButton.wrappedComponent {...props} />)
    expect(el.find(IconButton).props().onClick).toBe(el.instance().onClick)
  })

  it('should call remove in onClick', () => {
    const remove = spy()
    props.tab.remove = remove
    const el = shallow(<CloseButton.wrappedComponent {...props} />)
    el
      .find(IconButton)
      .props()
      .onClick()
    expect(remove.callCount).toBe(1)
    el
      .find(IconButton)
      .props()
      .onClick()
    expect(remove.callCount).toBe(2)
  })

  it('should not call remove in onClick if removing', () => {
    const remove = spy()
    props.tab.remove = remove
    props.tab.removing = true
    const el = shallow(<CloseButton.wrappedComponent {...props} />)
    el
      .find(IconButton)
      .props()
      .onClick()
    expect(remove.callCount).toBe(0)
    el
      .find(IconButton)
      .props()
      .onClick()
    expect(remove.callCount).toBe(0)
  })
})
