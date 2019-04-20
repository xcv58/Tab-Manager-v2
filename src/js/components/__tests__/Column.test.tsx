import React from 'react'
import { connectDropTarget } from 'test'
import { spy } from 'sinon'
import { shallow } from 'enzyme'
import Column from 'components/Column'
import FlipMove from 'react-flip-move'
import Window from 'components/Window'
import { createMuiTheme } from '@material-ui/core/styles'

const theme = createMuiTheme()
const windows = [{ id: 1 }, { id: 2 }]
const props = {
  connectDropTarget,
  dragStore: {
    drop: spy()
  },
  column: {
    windows
  },
  getScrollbars: spy(),
  dragPreview: 'preview node',
  width: '100%',
  theme
}

describe('Column', () => {
  it('render correct components', () => {
    const el = shallow(<Column {...props} />)
    expect(el.find('div').length).toBe(1)
    expect(el.find(FlipMove).length).toBe(1)
    expect(el.find(Window).length).toBe(2)
  })

  it('render correct margin based on left & right', () => {
    let el = shallow(<Column {...props} left />)
    expect(el.find('div').props().style.marginLeft).toBe('auto')
    expect(el.find('div').props().style.marginRight).toBeUndefined()
    el = shallow(<Column {...props} right />)
    expect(el.find('div').props().style.marginLeft).toBeUndefined()
    expect(el.find('div').props().style.marginRight).toBe('auto')
    el = shallow(<Column {...props} left right />)
    expect(el.find('div').props().style.marginLeft).toBe('auto')
    expect(el.find('div').props().style.marginRight).toBe('auto')
    el = shallow(<Column {...props} />)
    expect(el.find('div').props().style.marginLeft).toBeUndefined()
    expect(el.find('div').props().style.marginRight).toBeUndefined()
  })
})
