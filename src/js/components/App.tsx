import React, { useEffect, useRef } from 'react'
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
import { DndProvider } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import { useStore } from './StoreContext'

const App = observer(() => {
  const searchEl = useRef<HTMLInputElement>(null)
  const { windowStore, shortcutStore } = useStore()
  useEffect(() => {
    windowStore.didMount()
    shortcutStore.didMount(searchEl)
    return () => shortcutStore.willUnmount()
  }, [])
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
      <Tools inputRef={searchEl} />
      <Fade in>
        <Columns />
      </Fade>
      <Toolbar />
      <Shortcut />
      <DragPreview />
      <SettingsDialog />
    </Paper>
  )
})

export default observer(() => {
  const { windowStore, shortcutStore, themeStore } = useStore()
  const { muiTheme } = themeStore
  return (
    <MuiThemeProvider theme={muiTheme}>
      <React.StrictMode>
        <DndProvider backend={HTML5Backend}>
          <App {...{ windowStore, shortcutStore, themeStore }} />
        </DndProvider>
      </React.StrictMode>
    </MuiThemeProvider>
  )
})
