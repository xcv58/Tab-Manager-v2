import React from 'react'
import { inject, observer } from 'mobx-react'
import Window from './Window'
// import Search from './Search'

@inject('windowsStore')
@observer
export default class App extends React.Component {
  componentDidMount () {
    const { windowsStore: { updateAllWindows } } = this.props
    chrome.windows.onCreated.addListener(updateAllWindows)
    chrome.windows.onRemoved.addListener(updateAllWindows)
    chrome.tabs.onCreated.addListener(updateAllWindows)
    chrome.tabs.onUpdated.addListener(updateAllWindows)
    chrome.tabs.onMoved.addListener(updateAllWindows)
    chrome.tabs.onDetached.addListener(updateAllWindows)
    chrome.tabs.onRemoved.addListener(updateAllWindows)
    chrome.tabs.onReplaced.addListener(updateAllWindows)
  }

  render () {
    const { windowsStore: { tabCount, windows } } = this.props
    if (!tabCount) {
      return null
    }
    const winList = windows.map((win) => (
      <Window key={win.id} {...win} />
    ))
    return (
      <div>
        {/* <Search /> */}
        <p>
          Tabs: {tabCount}
        </p>
        {winList}
      </div>
    )
  }
}
