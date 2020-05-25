import React from 'react'
import { shallow } from 'enzyme'
import Preview from 'components/Preview'
import * as StoreContext from 'components/hooks/useStore'
import ViewOnlyTab from 'components/Tab/ViewOnlyTab'

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
    expect(el.find(ViewOnlyTab).length).toBe(sources.length)
  })
})
