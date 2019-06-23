import React from 'react'
import { observer } from 'mobx-react-lite'
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
import { useStore } from './StoreContext'

@DragDropContext(HTML5Backend)
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
    return (
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
    )
  }
}

export default observer(() => {
  const { windowStore, shortcutStore, themeStore } = useStore()
  const { muiTheme } = themeStore
  return (
    <MuiThemeProvider theme={muiTheme}>
      <React.StrictMode>
        <App {...{ windowStore, shortcutStore, themeStore }} />
      </React.StrictMode>
    </MuiThemeProvider>
  )
})
