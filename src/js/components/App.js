import React from 'react'
import { inject, observer } from 'mobx-react'
import Loading from 'components/Loading'
import WindowList from 'components/WindowList'
import Search from 'components/Search'
import Summary from 'components/Summary'
import ToolbarSwitch from 'components/Toolbar/ToolbarSwitch'
import Shortcut from 'components/Shortcut'
import Toolbar from 'components/Toolbar'
import { MuiThemeProvider, createMuiTheme } from 'material-ui/styles'

const theme = createMuiTheme({
  overrides: {
    MuiIconButton: {
      root: {
        height: '2.5rem',
        width: '2.5rem'
      }
    },
    MuiSwitch: {
      root: {
        width: '3.5rem'
      }
    },
    MuiTooltip: {
      root: {
        display: 'inline-flex'
      }
    }
  }
})

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
      <MuiThemeProvider theme={theme}>
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
            <ToolbarSwitch />
          </div>
          <WindowList />
          <Toolbar />
          <Shortcut />
        </div>
      </MuiThemeProvider>
    )
  }
}
