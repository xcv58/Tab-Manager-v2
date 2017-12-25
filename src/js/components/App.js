import React from 'react'
import { inject, observer } from 'mobx-react'
import Fade from 'material-ui/transitions/Fade'
import Slide from 'material-ui/transitions/Slide'
import Loading from 'components/Loading'
import WindowList from 'components/WindowList'
import Shortcut from 'components/Shortcut'
import Toolbar from 'components/Toolbar'
import Tools from 'components/Tools'
import DragPreview from 'components/DragPreview'
import { MuiThemeProvider, createMuiTheme } from 'material-ui/styles'
import { DragDropContext } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'

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
    MuiSnackbarContent: {
      root: {
        fontSize: '1.5rem',
        padding: '0 2rem',
        justifyContent: 'center',
        textTransform: 'capitalize',
        backgroundColor: 'rgba(0, 0, 0, 0.618)'
      }
    },
    MuiTooltip: {
      root: {
        display: 'inline-flex'
      }
    }
  }
})

@DragDropContext(HTML5Backend)
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
          <Slide in direction='down'>
            <Tools inputRef={(input) => { this.search = input }} />
          </Slide>
          <Fade in>
            <WindowList />
          </Fade>
          <Toolbar />
          <Shortcut />
          <DragPreview />
        </div>
      </MuiThemeProvider>
    )
  }
}
