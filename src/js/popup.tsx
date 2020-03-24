import App from 'components/App'
import log from 'loglevel'
import React from 'react'
import { render } from 'react-dom'
import { StoreContext, store } from 'components/StoreContext'
import '../css/popup.css'

const isProduction = process.env.NODE_ENV === 'production'

log.setDefaultLevel('DEBUG')

if (isProduction) {
  log.setLevel('INFO')
}

const init = () => {
  render(
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>,
    window.document.getElementById('app-container')
  )
  if (!isProduction) {
    require('react-axe')(React, require('react-dom'), 1000)
  }
}

init()
