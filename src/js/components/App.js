import React from 'react'
import { inject, observer } from 'mobx-react'
import { LinearProgress } from 'material-ui/Progress'
import WindowList from './WindowList'
import Search from './Search'
import Tools from './Tools'
import Mousetrap from 'mousetrap'
import shortcuts, { stopCallback } from '../libs/shortcuts'

Mousetrap.prototype.stopCallback = stopCallback

@inject('arrangeStore')
@inject('windowStore')
@inject('searchStore')
@inject('tabStore')
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
    shortcuts.map(([ key, func ]) => Mousetrap.bind(key, func.bind(this)))
  }

  componentWillUnmount () {
    Mousetrap.reset()
  }

  render () {
    const { windowStore: { tabCount } } = this.props
    if (!tabCount) {
      return (<LinearProgress />)
    }
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100vh'
      }}>
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
      </div>
    )
  }
}
