import React from 'react'
import { shallow, expect, describe, it } from 'test'
import IconButton from '@material-ui/core/IconButton'
import Checkbox from '@material-ui/core/Checkbox'
import Tooltip from '@material-ui/core/Tooltip'
import Icon from 'components/Tab/Icon'
import TabTooltip from 'components/Tab/TabTooltip'

const props = {
  children: 'children',
  faked: false,
  dragStore: { dragging: false },
  hoverStore: { hovered: true },
  tab: { title: 'title', url: 'url', isHovered: true, urlCount: 1 }
}

describe('Icon', () => {
  it('should render correct components', () => {
    let el = shallow(<Icon {...props} />).dive()
    expect(el.find(Checkbox).length).toBe(1)

    el = shallow(
      <Icon {...props} tab={{ ...props.tab, isHovered: false }} />
    ).dive()
    expect(el.find(IconButton).length).toBe(1)
    expect(el.find('img').length).toBe(1)
  })
})

describe('TabTooltip', () => {
  it('should render correct components', () => {
    const el = shallow(
      <TabTooltip.wrappedComponent.wrappedComponent {...props} />
    )
    expect(el.find(Tooltip).length).toBe(1)
    expect(el.find(Tooltip).props().open).toBe(true)
    const title = shallow(el.find(Tooltip).props().title)
    expect(title.text()).toBe(props.tab.title + props.tab.url)
  })

  it('should render duplicated alert', () => {
    const el = shallow(
      <TabTooltip.wrappedComponent.wrappedComponent
        {...props}
        tab={{ ...props.tab, urlCount: 2 }}
      />
    )
    const title = shallow(el.find(Tooltip).props().title)
    expect(title.text()).toBe(
      'There is duplicated tab!' + props.tab.title + props.tab.url
    )
  })

  it('should render null', () => {
    let el = shallow(
      <TabTooltip.wrappedComponent.wrappedComponent {...props} faked />
    )
    expect(el.getElement()).toBe(null)
    el = shallow(
      <TabTooltip.wrappedComponent.wrappedComponent
        {...props}
        dragStore={{ dragging: true }}
      />
    )
    expect(el.getElement()).toBe(null)
    el = shallow(
      <TabTooltip.wrappedComponent.wrappedComponent
        {...props}
        hoverStore={{ hovered: false }}
      />
    )
    expect(el.getElement()).toBe(null)
    el = shallow(
      <TabTooltip.wrappedComponent.wrappedComponent
        {...props}
        tab={{ ...props.tab, isHovered: false }}
      />
    )
    expect(el.getElement()).toBe(null)
  })
})
