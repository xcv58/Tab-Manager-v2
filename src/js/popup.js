import '../css/popup.css'
import App from './components/App'
import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'mobx-react'
import windowsStore from './stores/WindowsStore'
import tabsStore from './stores/TabsStore'

render(
  <Provider {...{ windowsStore, tabsStore }}>
    <App />
  </Provider>,
  window.document.getElementById('app-container')
)
