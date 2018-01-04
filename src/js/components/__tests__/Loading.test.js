/* global expect, test */
import React from 'react'
import { shallow } from 'test'
import { CircularProgress } from 'material-ui/Progress'
import Loading from '../Loading'

test('adds 1 + 2 to equal 3', () => {
  const el = shallow(<Loading />)
  expect(el.text()).toBe('Loading...')
  setTimeout(() => {
    // The setState in componentDidMount doesn't work
    el.setState(el.state())
    expect(el.find(CircularProgress).length).toBe(1)
  }, 1000)
})

test('Loading should clear timer before unmount', () => {
  const el = shallow(<Loading />)
  expect(el.instance().timer).toBeTruthy()
  el.instance().componentWillUnmount()
  expect(el.instance().timer).toBeNull()
})

test('Loading should not clear timer if there is no timer', () => {
  const el = shallow(<Loading />)
  expect(el.text()).toBe('Loading...')
  setTimeout(() => {
    el.instance().componentWillUnmount()
    expect(el.instance().timer).toBeNull()
  }, 1000)
})
