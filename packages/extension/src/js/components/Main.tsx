import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import classNames from 'classnames'
import { useTheme as useMuiTheme } from '@mui/material/styles'
import WinList from 'components/WinList'
import Shortcut from 'components/Shortcut'
import Toolbar from 'components/Toolbar'
import SettingsDialog from 'components/Toolbar/SettingsDialog'
import { useStore, useFontSize } from './hooks/useStore'
import DragLayer from './DragLayer'
import { useTextClasses } from './hooks/useTheme'
import DroppableTools from './DroppableTools'
import { useLocation } from 'react-router-dom'
import { NOT_POPUP } from 'libs'
import PopupView from './PopupView'

const useQuery = () => new URLSearchParams(useLocation().search)

export default observer(() => {
  const query = useQuery()
  const isPopup = !query.has(NOT_POPUP)
  const theme = useMuiTheme()
  const { windowStore, shortcutStore, tabGroupStore, userStore } = useStore()
  const { toolbarAutoHide, litePopupMode } = userStore
  const liteMode = isPopup && litePopupMode
  const fontSize = useFontSize()
  useEffect(() => {
    windowStore.didMount()
    shortcutStore.didMount()
    return () => {
      shortcutStore.willUnmount()
      tabGroupStore?.willUnmount?.()
      windowStore.willUnmount()
    }
  }, [])
  useEffect(() => {
    document.getElementsByTagName('html')[0].style.fontSize = `${fontSize}px`
  }, [fontSize])
  return (
    <main
      className={classNames(
        'flex flex-col h-screen overflow-hidden',
        { 'pb-12': !toolbarAutoHide },
        useTextClasses(),
      )}
      style={{
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      {liteMode ? (
        <PopupView />
      ) : (
        <>
          <DroppableTools />
          <WinList />
          <Toolbar />
          <DragLayer />
        </>
      )}
      <Shortcut />
      <SettingsDialog />
    </main>
  )
})
