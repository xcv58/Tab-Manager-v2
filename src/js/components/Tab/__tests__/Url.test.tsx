import React from 'react'
import { spy, stub } from 'sinon'
import { shallow } from 'enzyme'
import Url from 'components/Tab/Url'
import Typography from '@material-ui/core/Typography'

const getHighlightNode = spy()
const props = {
  tab: { url: 'url' },
  className: 'className',
  getHighlightNode
}

describe('Url', () => {
  it('render correct components', () => {
    const el = shallow(<Url {...props} />)
    expect(el.find(Typography).length).toBe(1)
    expect(el.find(Typography).props().className).toBe(props.className)
  })

  it('render getHighlightNode(url) as children', () => {
    const getHighlightNode = stub()
    getHighlightNode.returns('xyz')
    const el = shallow(<Url {...props} getHighlightNode={getHighlightNode} />)
    expect(el.children().text()).toBe('xyz')
  })
})
