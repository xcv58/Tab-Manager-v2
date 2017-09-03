import '../css/popup.css'
import Timer from './components/Timer'
import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'mobx-react'
import timerStore from './stores/TimerStore'

render(
  <Provider {...{ timerStore }}>
    <Timer />
  </Provider>,
  window.document.getElementById('app-container')
)
