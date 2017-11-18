import React from 'react'
import { inject, observer } from 'mobx-react'
import Loading from 'components/Loading'
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
    const { getAllWindows, updateAllWindows } = this.props.windowStore
    chrome.windows.onCreated.addListener(updateAllWindows)
    chrome.windows.onRemoved.addListener(updateAllWindows)
    chrome.windows.onFocusChanged.addListener(updateAllWindows)
    chrome.tabs.onCreated.addListener(updateAllWindows)
    chrome.tabs.onUpdated.addListener(updateAllWindows)
    chrome.tabs.onMoved.addListener(updateAllWindows)
    chrome.tabs.onDetached.addListener(updateAllWindows)
    chrome.tabs.onRemoved.addListener(updateAllWindows)
    chrome.tabs.onReplaced.addListener(updateAllWindows)
    chrome.tabs.onActivated.addListener(updateAllWindows)
    this.props.shortcutStore.didMount(this)
    getAllWindows()
  }

  componentWillUnmount () {
    this.props.shortcutStore.willUnmount()
  }

  render () {
    if (this.props.windowStore.initialLoading) {
      return (<Loading />)
    }
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
          marginTop: '-0.8rem',
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
