import React from 'react'
import { spy, stub, shallow, expect, describe, it } from 'test'
import Url from 'components/Tab/Url'

const getHighlightNode = spy()
const props = {
  tab: { url: 'url' },
  className: 'className',
  getHighlightNode
}

describe('Url', () => {
  it('render correct components', () => {
    const el = shallow(<Url {...props} />)
    expect(el.find('div').length).toBe(1)
    expect(el.find('div').props().className).toBe(props.className)
  })

  it('render getHighlightNode(url) as children', () => {
    const getHighlightNode = stub()
    getHighlightNode.returns('xyz')
    const el = shallow(<Url {...props} getHighlightNode={getHighlightNode} />)
    expect(el.children().text()).toBe('xyz')
  })
})
