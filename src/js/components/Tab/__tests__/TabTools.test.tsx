import React from 'react'
import { shallow } from 'enzyme'
import TabTools from 'components/Tab/TabTools'
import TabMenu from 'components/Tab/TabMenu'
import DragHandle from 'components/Tab/DragHandle'
import * as StoreContext from 'components/StoreContext'

const classes = { root: 'root' }
const props = {
  classes,
  faked: false,
  tab: { isHovered: true, removing: false }
}
const mockStore = {
  dragStore: { dragging: false }
}

describe('TabTools', () => {
  beforeEach(() => {
    jest.spyOn(StoreContext, 'useStore').mockImplementation(() => mockStore)
  })

  it('should render correct components', () => {
    const el = shallow(<TabTools {...props} />)
    expect(el.find('div').length).toBe(1)
    expect(el.find(TabMenu).length).toBe(1)
    expect(el.find(DragHandle).length).toBe(1)
  })

  it('should render null', () => {
    let el = shallow(<TabTools {...props} faked />)
    expect(el.getElement()).toBe(null)

    el = shallow(<TabTools {...props} tab={{ isHovered: false }} />)
    expect(el.getElement()).toBe(null)

    jest
      .spyOn(StoreContext, 'useStore')
      .mockImplementation(() => ({ dragStore: { dragging: true } }))
    el = shallow(<TabTools {...props} />)
    expect(el.getElement()).toBe(null)
  })
})
