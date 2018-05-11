import React from 'react'
import { spy, shallow, expect, describe, it } from 'test'
import Checkbox from 'material-ui/Checkbox'
import IconButton from 'material-ui/IconButton'
import Icon from 'components/Tab/Icon'

const props = {
  tab: { focus: spy(), select: spy(), iconUrl: 'url', isHovered: false }
}

describe('Icon', () => {
  it('should render IconButton if not hovered', () => {
    const el = shallow(<Icon {...props} />)
    expect(el.find(IconButton).length).toBe(1)
    expect(el.find('img').length).toBe(1)
  })

  it('should render Checkbox if hovered', () => {
    const el = shallow(
      <Icon {...props} tab={{ ...props.tab, isHovered: true }} />
    )
    expect(el.find(Checkbox).length).toBe(1)
    expect(el.find(Checkbox).props().onChange).toBe(props.tab.select)
  })
})
