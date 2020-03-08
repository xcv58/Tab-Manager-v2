import React from 'react'
import { mount } from 'enzyme'
import Loading from 'components/Loading'
import { ThemeContext } from 'components/ThemeContext'

describe('Loading should', () => {
  it('render divs', () => {
    const el = mount(<Loading />)
    expect(el.find('div').length).toBe(10)
    const spinner = el.find({ id: 'spinner' })
    expect(spinner.length).toBe(1)
    const la = spinner.find({ className: 'la-ball-spin la-3x la-dark' })
    expect(la.length).toBe(1)
    expect(la.find('div').length).toBe(9)
    expect(el.text()).toBe('')
  })

  it('render divs in dark mode', () => {
    const el = mount(
      <ThemeContext.Provider value>
        <Loading />
      </ThemeContext.Provider>
    )
    expect(el.find('div').length).toBe(10)
    const spinner = el.find({ id: 'spinner' })
    expect(spinner.length).toBe(1)
    const la = el.find({ className: 'la-ball-spin la-3x' })
    expect(la.length).toBe(1)
    expect(la.find('div').length).toBe(9)
    expect(el.text()).toBe('')
  })
})
