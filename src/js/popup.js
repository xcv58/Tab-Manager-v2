import '../css/popup.css'
import App from './components/App'
import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'mobx-react'
import windowsStore from './stores/WindowsStore'
import tabsStore from './stores/TabsStore'
import searchStore from './stores/SearchStore'

render(
  <Provider {...{ windowsStore, tabsStore, searchStore }}>
    <App />
  </Provider>,
  window.document.getElementById('app-container')
)
