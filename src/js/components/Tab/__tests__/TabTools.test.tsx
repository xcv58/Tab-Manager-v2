import React from 'react'
import { shallow } from 'enzyme'
import TabTools from 'components/Tab/TabTools'
import TabMenu from 'components/Tab/TabMenu'

const classes = { root: 'root' }
const props = {
  classes,
  faked: false,
  dragStore: { dragging: false },
  tab: { isHovered: true, removing: false }
}

describe('TabTools', () => {
  it('should render correct components', () => {
    const el = shallow(<TabTools.wrappedComponent {...props} />)
    expect(el.find('div').length).toBe(1)
    expect(el.find('div').props().className).toBe(classes.root)
    expect(el.find(TabMenu).length).toBe(1)
  })

  it('should render null', () => {
    let el = shallow(<TabTools.wrappedComponent {...props} faked />)
    expect(el.getElement()).toBe(null)
    el = shallow(
      <TabTools.wrappedComponent {...props} dragStore={{ dragging: true }} />
    )
    expect(el.getElement()).toBe(null)
    el = shallow(
      <TabTools.wrappedComponent {...props} tab={{ isHovered: false }} />
    )
    expect(el.getElement()).toBe(null)
  })
})
