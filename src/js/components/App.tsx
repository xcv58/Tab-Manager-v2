import React from 'react'
import { inject, observer } from 'mobx-react'
import Fade from '@material-ui/core/Fade'
import Paper from '@material-ui/core/Paper'
import Columns from 'components/Columns'
import Shortcut from 'components/Shortcut'
import Toolbar from 'components/Toolbar'
import Tools from 'components/Tools'
import DragPreview from 'components/DragPreview'
import SettingsDialog from 'components/Toolbar/SettingsDialog'
import { MuiThemeProvider } from '@material-ui/core/styles'
import { DragDropContext } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'

@DragDropContext(HTML5Backend)
@observer
class App extends React.Component<any, {}> {
  search: any

  componentDidMount () {
    this.props.windowStore.didMount(this)
    this.props.shortcutStore.didMount(this)
  }

  componentWillUnmount () {
    this.props.shortcutStore.willUnmount()
  }

  render () {
    const { muiTheme } = this.props.themeStore
    return (
      <React.StrictMode>
        <MuiThemeProvider theme={muiTheme}>
          <Paper
            style={{
              // backgroundColor: theme.app.backgroundColor,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              height: '100vh'
            }}
          >
            <Tools
              inputRef={(input: any) => {
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
          </Paper>
        </MuiThemeProvider>
      </React.StrictMode>
    )
  }
}

export default inject((stores: any) => {
  const { windowStore, shortcutStore, themeStore } = stores
  return { windowStore, shortcutStore, themeStore }
})(App)
