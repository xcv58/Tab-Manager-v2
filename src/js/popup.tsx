import App from 'components/App'
import React from 'react'
import ReactDOM from 'react-dom'
import { StoreContext, store } from 'components/StoreContext'
import '../css/popup.css'

const init = () => {
  const container = window.document.getElementById('app-container')
  container.removeChild(container.firstChild)

  ReactDOM.createRoot(container).render(
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>
  )
  if (process.env.NODE_ENV !== 'production') {
    require('react-axe')(React, require('react-dom'), 1000)
  }
}

init()
