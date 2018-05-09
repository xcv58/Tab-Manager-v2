import React from 'react'
import { spy, stub, shallow, expect, describe, it } from 'test'
import Url from 'components/Tab/Url'

const getHighlightNode = spy()
const props = {
  tab: { url: 'url', shouldHighlight: false },
  getHighlightNode
}

describe('Url', () => {
  it('render correct components', () => {
    const el = shallow(<Url {...props} />)
    expect(el.find('div').length).toBe(1)
  })

  it('render correct style based on shouldHighlight', () => {
    let el = shallow(<Url {...props} />)
    expect(el.find('div').props().style).toEqual({
      opacity: 0.3,
      fontSize: '0.7rem'
    })
    el = shallow(
      <Url {...props} tab={{ ...props.tab, shouldHighlight: true }} />
    )
    expect(el.find('div').props().style).toEqual({
      opacity: 1,
      fontSize: '0.7rem'
    })
  })

  it('render getHighlightNode(url) as children', () => {
    const getHighlightNode = stub()
    getHighlightNode.returns('xyz')
    const el = shallow(<Url {...props} getHighlightNode={getHighlightNode} />)
    expect(el.children().text()).toBe('xyz')
  })
})
