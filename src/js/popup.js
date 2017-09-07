import '../css/popup.css'
import 'chrome-extension-async'
import App from './components/App'
import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'mobx-react'
import Store from './stores'

const store = new Store()

render(
  <Provider {...store}>
    <App />
  </Provider>,
  window.document.getElementById('app-container')
)
