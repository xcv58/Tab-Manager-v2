/// <reference types="webpack-env" />
import App from 'components/App'
import React from 'react'
import { render } from 'react-dom'
import { StoreContext, store } from 'components/StoreContext'
import { isProduction } from 'libs'
import '../css/popup.css'

const init = () => {
  render(
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>,
    window.document.getElementById('app-container')
  )
  if (!isProduction()) {
    // require('react-axe')(React, require('react-dom'), 1000)
  }
}

init()

// Hot Module Replacement
if (module.hot) {
  module.hot.accept('components/App', () => {
    const NewApp = require('components/App').default
    render(
      <StoreContext.Provider value={store}>
        <NewApp />
      </StoreContext.Provider>,
      window.document.getElementById('app-container')
    )
  })
}
