import 'css/popup.css'
import React from 'react'
import { storiesOf } from '@storybook/react'
import App from 'components/App'

storiesOf('App', module)
  .add('App', () => (
    <App />
  ))
