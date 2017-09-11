import '../img/icon-16.png'
import '../img/icon-48.png'
import '../img/icon-128.png'
import 'chrome-extension-async'
import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'mobx-react'
import Background from './components/Background'
import BackgroundStore from './stores/BackgroundStore'

const store = new BackgroundStore()

render(
  <Provider store={store}>
    <Background />
  </Provider>,
  window.document.getElementById('app-container')
)
