import React from 'react'
import { shallow, expect, describe, it } from 'test'
import { createMuiTheme } from '@material-ui/core/styles'
import TabTools from 'components/Tab/TabTools'
import CloseButton from 'components/Tab/CloseButton'
import TabMenu from 'components/Tab/TabMenu'

const theme = createMuiTheme()
const props = {
  theme,
  faked: false,
  dragStore: { dragging: false },
  tab: { isHovered: true, removing: false }
}

describe('TabTools', () => {
  it('should render correct components', () => {
    const el = shallow(<TabTools.wrappedComponent {...props} />)
    expect(el.find('div').length).toBe(1)
    expect(el.find(TabMenu).length).toBe(1)
    expect(el.find(CloseButton).length).toBe(1)
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
