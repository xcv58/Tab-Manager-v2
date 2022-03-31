/// <reference types="webpack-env" />
import App from 'components/App'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { isProduction } from 'libs'
import '../css/popup.css'

const init = () => {
  const root = createRoot(window.document.getElementById('app-container'))
  root.render(<App />)
  if (!isProduction()) {
    // require('react-axe')(React, require('react-dom'), 1000)
  }
}

init()

// Hot Module Replacement
if (module.hot) {
  module.hot.accept('components/App', () => {
    const NewApp = require('components/App').default
    const root = createRoot(window.document.getElementById('app-container'))
    root.render(<NewApp />)
  })
}
