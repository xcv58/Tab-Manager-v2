import React from 'react'
import { configure, addDecorator } from '@storybook/react'
import Store from 'stores'
import { Provider } from 'mobx-react'

const store = new Store()

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
