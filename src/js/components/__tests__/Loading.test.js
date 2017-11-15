import React from 'react'
import test from 'ava'
import { shallow } from 'test'
import { CircularProgress } from 'material-ui/Progress'
import Loading from '../Loading'

test.cb('Loading should show Loading... first then CircularProgress', t => {
  const el = shallow(<Loading />)
  t.is(el.text(), 'Loading...')
  setTimeout(() => {
    // The setState in componentDidMount doesn't work
    el.setState(el.state())
    t.is(el.find(CircularProgress).length, 1)
    t.end()
  }, 1000)
})

test('Loading should clear timer before unmount', t => {
  const el = shallow(<Loading />)
  t.is(el.instance().timer._idleTimeout, 100)
  el.instance().componentWillUnmount()
  t.is(el.instance().timer._idleTimeout, -1)
})

test.cb('Loading should not clear timer if there is no timer', t => {
  const el = shallow(<Loading />)
  t.is(el.text(), 'Loading...')
  setTimeout(() => {
    el.instance().componentWillUnmount()
    t.is(el.instance().timer, null)
    t.end()
  }, 1000)
})
