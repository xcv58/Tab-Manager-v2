import App from 'components/App'
import React from 'react'
import { render } from 'react-dom'
import { StoreContext, store } from 'components/StoreContext'
import '../css/popup.css'

const init = () => {
  render(
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>,
    window.document.getElementById('app-container')
  )
  if (process.env.NODE_ENV !== 'production') {
    // require('react-axe')(React, require('react-dom'), 1000)
  }
}

init()
