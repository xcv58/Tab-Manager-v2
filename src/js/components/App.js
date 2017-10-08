import React from 'react'
import { inject, observer } from 'mobx-react'
import WindowList from 'components/WindowList'
import Search from 'components/Search'
import Summary from 'components/Summary'
import Tools from 'components/Tools'
import Shortcut from 'components/Shortcut'

@inject('windowStore')
@inject('shortcutStore')
@observer
export default class App extends React.Component {
  componentDidMount () {
    const { windowStore: { updateAllWindows } } = this.props
    chrome.windows.onCreated.addListener(updateAllWindows)
    chrome.windows.onRemoved.addListener(updateAllWindows)
    chrome.tabs.onCreated.addListener(updateAllWindows)
    chrome.tabs.onUpdated.addListener(updateAllWindows)
    chrome.tabs.onMoved.addListener(updateAllWindows)
    chrome.tabs.onDetached.addListener(updateAllWindows)
    chrome.tabs.onRemoved.addListener(updateAllWindows)
    chrome.tabs.onReplaced.addListener(updateAllWindows)
    chrome.tabs.onActivated.addListener(updateAllWindows)
    this.props.shortcutStore.didMount(this)
    updateAllWindows()
  }

  componentWillUnmount () {
    this.props.shortcutStore.willUnmount()
  }

  render () {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100vh'
      }}>
        <Summary />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flex: '0 0 auto',
          padding: '0 4px'
        }}>
          <Search inputRef={(input) => { this.search = input }} />
          <Tools />
        </div>
        <WindowList />
        <Shortcut />
      </div>
    )
  }
}
