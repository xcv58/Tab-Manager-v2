import App from 'components/App'
import React from 'react'
import ReactDOM, { render } from 'react-dom'
import { Provider } from 'mobx-react'
import Store from 'stores'
import '../css/popup.css'

const store = new Store()

const init = () => {
  render(
    <Provider {...store}>
      <App />
    </Provider>,
    window.document.getElementById('app-container')
  )
  if (process.env.NODE_ENV !== 'production') {
    var axe = require('react-axe')
    axe(React, ReactDOM, 1000)
  }
}

init()
