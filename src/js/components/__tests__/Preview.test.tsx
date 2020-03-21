import React from 'react'
import { shallow } from 'enzyme'
import Tab from 'components/Tab/Tab'
import Preview from 'components/Preview'
import * as StoreContext from 'components/StoreContext'

const sources = [{ id: 1 }, { id: 2 }]
const mockStore = {
  tabStore: { sources }
}

describe('Preview', () => {
  beforeEach(() => {
    jest.spyOn(StoreContext, 'useStore').mockImplementation(() => mockStore)
  })

  it('render correct components', () => {
    const el = shallow(<Preview />)
    expect(el.find('div').length).toBe(1)
    expect(el.find(Tab).length).toBe(sources.length)
    expect(el.find(Tab).first().props().faked).toBe(true)
    expect(el.find(Tab).last().props().faked).toBe(true)
  })
})
