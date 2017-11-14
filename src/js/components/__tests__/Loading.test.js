import React from 'react'
import test from 'ava'
import { shallow, configure } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import { CircularProgress } from 'material-ui/Progress'
import Loading from '../Loading'

configure({ adapter: new Adapter() })

test.cb('Loading', t => {
  const el = shallow(<Loading />)
  t.is(el.text(), 'Loading...')
  setTimeout(() => {
    // The setState in componentDidMount doesn't work
    el.setState(el.state())
    t.is(el.find(CircularProgress).length, 1)
    t.end()
  }, 1000)
})
