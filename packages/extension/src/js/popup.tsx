/// <reference types="webpack-env" />
// import App from 'components/App'
import App from 'components/Test'
import React from 'react'
import { render } from 'react-dom'
import { isProduction } from 'libs'
// import '../css/popup.css'

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
    const NewApp = require('components/Test').default
    render(<NewApp />, window.document.getElementById('app-container'))
  })
}
