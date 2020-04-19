/// <reference types="webpack-env" />
import App from 'components/App'
import React from 'react'
import { render } from 'react-dom'
import { isProduction } from 'libs'
import 'mobx-react-lite/batchingForReactDom'
import '../css/popup.css'

const init = () => {
  render(<App />, window.document.getElementById('app-container'))
  if (!isProduction()) {
    // require('react-axe')(React, require('react-dom'), 1000)
  }
}

init()

// Hot Module Replacement
if (module.hot) {
  module.hot.accept('components/App', () => {
    const NewApp = require('components/App').default
    render(<NewApp />, window.document.getElementById('app-container'))
  })
}
