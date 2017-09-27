import React from 'react'
import { configure, addDecorator } from '@storybook/react'
import { Provider } from 'mobx-react'
import store from './store'

addDecorator(story => (
  <Provider {...store}>
    {story()}
  </Provider>
))

const req = require.context('../stories', true, /\.js$/)

function loadStories () {
  req.keys().forEach((filename) => req(filename))
}

configure(loadStories, module)
