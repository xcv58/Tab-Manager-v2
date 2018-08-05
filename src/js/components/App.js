import React from 'react'
import { inject, observer } from 'mobx-react'
import Fade from '@material-ui/core/Fade'
import Loading from 'components/Loading'
import Columns from 'components/Columns'
import Shortcut from 'components/Shortcut'
import Toolbar from 'components/Toolbar'
import Tools from 'components/Tools'
import DragPreview from 'components/DragPreview'
import SettingsDialog from 'components/Toolbar/SettingsDialog'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'
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
      tooltip: {
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
    this.props.windowStore.didMount(this)
    this.props.shortcutStore.didMount(this)
  }

  componentWillUnmount () {
    this.props.shortcutStore.willUnmount()
  }

  render () {
    if (this.props.windowStore.initialLoading) {
      return <Loading />
    }
    return (
      <React.StrictMode>
        <MuiThemeProvider theme={theme}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              height: '100vh'
            }}
          >
            <Tools
              inputRef={input => {
                this.search = input
              }}
            />
            <Fade in>
              <Columns />
            </Fade>
            <Toolbar />
            <Shortcut />
            <DragPreview />
            <SettingsDialog />
          </div>
        </MuiThemeProvider>
      </React.StrictMode>
    )
  }
}
