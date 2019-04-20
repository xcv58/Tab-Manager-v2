import React from 'react'
import { shallow } from 'enzyme'
import Tab from 'components/Tab/Tab'
import Preview from 'components/Preview'

const sources = [{ id: 1 }, { id: 2 }]
const props = {
  tabStore: { sources }
}

describe('Preview', () => {
  it('render correct components', () => {
    const el = shallow(<Preview.wrappedComponent {...props} />)
    expect(el.find('div').length).toBe(1)
    expect(el.find(Tab).length).toBe(sources.length)
    expect(
      el
        .find(Tab)
        .first()
        .props().faked
    ).toBe(true)
    expect(
      el
        .find(Tab)
        .last()
        .props().faked
    ).toBe(true)
  })
})
