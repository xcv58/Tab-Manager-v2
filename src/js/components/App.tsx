import React, { useEffect, useRef, StrictMode } from 'react'
import { observer } from 'mobx-react'
import Fade from '@material-ui/core/Fade'
import Paper from '@material-ui/core/Paper'
import Columns from 'components/Columns'
import Shortcut from 'components/Shortcut'
import Toolbar from 'components/Toolbar'
import Tools from 'components/Tools'
import SettingsDialog from 'components/Toolbar/SettingsDialog'
import { MuiThemeProvider } from '@material-ui/core/styles'
import { DndProvider } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import { useStore } from './StoreContext'
import DragLayer from './DragLayer'

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
      <SettingsDialog />
      <DragLayer />
    </Paper>
  )
})

export default observer(() => {
  const { themeStore } = useStore()
  return (
    <StrictMode>
      <MuiThemeProvider theme={themeStore.muiTheme}>
        <DndProvider backend={HTML5Backend}>
          <App />
        </DndProvider>
      </MuiThemeProvider>
    </StrictMode>
  )
})
