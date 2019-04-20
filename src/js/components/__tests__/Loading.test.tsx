import React from 'react'
import { shallow } from 'enzyme'
import Loading from 'components/Loading'

describe('Loading should', () => {
  it('render divs', () => {
    const el = shallow(<Loading />)
    expect(el.find('div').length).toBe(10)
    const spinner = el.find({ id: 'spinner' })
    expect(spinner.length).toBe(1)
    const la = spinner.find({ className: 'la-ball-spin la-dark la-3x' })
    expect(la.length).toBe(1)
    expect(la.find('div').length).toBe(9)
    expect(el.text()).toBe('')
  })
})
