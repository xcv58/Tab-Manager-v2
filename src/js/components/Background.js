import React from 'react'
import { inject, observer } from 'mobx-react'

@inject('store')
@observer
export default class App extends React.Component {
  componentDidMount () {
    const { store: { onActivated, onFocusChanged, onRemoved } } = this.props
    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onRemoved.addListener(onRemoved)
    chrome.windows.onFocusChanged.addListener(onFocusChanged)
  }

  render () {
    return null
  }
}
