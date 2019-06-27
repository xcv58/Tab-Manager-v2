import App from 'components/App'
import React from 'react'
import { Provider } from 'mobx-react'
import { render } from 'react-dom'
// import ReactDOM, { render } from 'react-dom'
import { StoreContext, store } from 'components/StoreContext'
import '../css/popup.css'

const init = () => {
  render(
    <StoreContext.Provider value={store}>
      <Provider {...store}>
        <App />
      </Provider>
    </StoreContext.Provider>,
    window.document.getElementById('app-container')
  )
  // if (process.env.NODE_ENV !== 'production') {
  //   var axe = require('react-axe')
  //   axe(React, ReactDOM, 1000)
  // }
}

init()
