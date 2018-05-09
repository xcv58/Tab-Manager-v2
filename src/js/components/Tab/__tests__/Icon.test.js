import React from 'react'
import { spy, shallow, expect, describe, it } from 'test'
import IconButton from 'material-ui/IconButton'
import Icon from 'components/Tab/Icon'

const props = {
  tab: { focus: spy(), select: spy(), iconUrl: 'url' }
}

describe('Icon', () => {
  it('should render correct components', () => {
    const el = shallow(<Icon {...props} />)
    expect(el.find(IconButton).length).toBe(1)
    expect(el.find('img').length).toBe(1)
  })
})
