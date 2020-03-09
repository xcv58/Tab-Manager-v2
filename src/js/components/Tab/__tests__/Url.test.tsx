import React from 'react'
import { spy, stub } from 'sinon'
import { shallow } from 'enzyme'
import Url from 'components/Tab/Url'

const getHighlightNode = spy()
const props = {
  tab: { url: 'url' },
  getHighlightNode
}

describe('Url', () => {
  it('render correct components', () => {
    const el = shallow(<Url {...props} />)
    expect(el.find('div').length).toBe(1)
  })

  it('render getHighlightNode(url) as children', () => {
    const getHighlightNode = stub()
    getHighlightNode.returns('xyz')
    const el = shallow(<Url {...props} getHighlightNode={getHighlightNode} />)
    expect(el.children().text()).toBe('xyz')
  })
})
