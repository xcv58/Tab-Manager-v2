import React from 'react'
import { shallow } from 'enzyme'
import IconButton from '@material-ui/core/IconButton'
import Checkbox from '@material-ui/core/Checkbox'
import Tooltip from '@material-ui/core/Tooltip'
import Icon from 'components/Tab/Icon'
import TabTooltip from 'components/Tab/TabTooltip'
import * as StoreContext from 'components/StoreContext'

const props = {
  children: 'children',
  faked: false,
  tab: { title: 'title', url: 'url', isHovered: true, urlCount: 1 }
}
const mockStore = {
  dragStore: { dragging: false },
  hoverStore: { hovered: true }
}

describe('Icon', () => {
  it('should render correct components', () => {
    let el = shallow(<Icon {...props} />)
    expect(el.find(Checkbox).length).toBe(1)

    el = shallow(<Icon {...props} tab={{ ...props.tab, isHovered: false }} />)
    expect(el.find(IconButton).length).toBe(1)
    expect(el.find('img').length).toBe(1)
  })
})

describe('TabTooltip', () => {
  beforeEach(() => {
    jest.spyOn(StoreContext, 'useStore').mockImplementation(() => mockStore)
  })

  it('should render correct components', () => {
    const el = shallow(<TabTooltip {...props} />)
    expect(el.find(Tooltip).length).toBe(1)
    expect(el.find(Tooltip).props().open).toBe(true)
    const title = shallow(el.find(Tooltip).props().title)
    expect(title.text()).toBe(props.tab.title + props.tab.url)
  })

  it('should render duplicated alert', () => {
    const el = shallow(
      <TabTooltip {...props} tab={{ ...props.tab, urlCount: 2 }} />
    )
    const title = shallow(el.find(Tooltip).props().title)
    expect(title.text()).toBe(
      'There is duplicated tab!' + props.tab.title + props.tab.url
    )
  })

  it('should render null', () => {
    let el = shallow(<TabTooltip {...props} faked />)
    expect(el.getElement()).toBe(null)

    expect(el.getElement()).toBe(null)
    el = shallow(
      <TabTooltip {...props} tab={{ ...props.tab, isHovered: false }} />
    )
    expect(el.getElement()).toBe(null)

    jest.spyOn(StoreContext, 'useStore').mockImplementation(() => ({
      ...mockStore,
      dragStore: { dragging: true }
    }))
    el = shallow(<TabTooltip {...props} dragStore={{ dragging: true }} />)
    expect(el.getElement()).toBe(null)

    jest.spyOn(StoreContext, 'useStore').mockImplementation(() => ({
      ...mockStore,
      hoverStore: { hovered: true }
    }))
    el = shallow(<TabTooltip {...props} hoverStore={{ hovered: false }} />)
  })
})
