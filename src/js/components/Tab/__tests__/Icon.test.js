import React from 'react'
import { spy, shallow, expect, describe, it } from 'test'
import Checkbox from 'material-ui/Checkbox'
import IconButton from 'material-ui/IconButton'
import Icon from 'components/Tab/Icon'

const props = {
  tab: { focus: spy(), select: spy(), iconUrl: 'url' }
}

describe('Icon', () => {
  it('should render correct component', () => {
    const el = shallow(<Icon {...props} />).dive()
    expect(el.find(IconButton).length).toBe(1)
    expect(el.find('img').length).toBe(1)
    expect(el.find(Checkbox).length).toBe(1)
    expect(el.find(Checkbox).props().onChange).toBe(props.tab.select)
  })
})
