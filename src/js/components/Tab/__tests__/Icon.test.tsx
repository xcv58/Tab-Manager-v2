import React from 'react'
import { spy } from 'sinon'
import { shallow } from 'enzyme'
import Checkbox from '@material-ui/core/Checkbox'
import IconButton from '@material-ui/core/IconButton'
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
