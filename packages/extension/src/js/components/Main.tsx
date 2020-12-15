import React, { useEffect } from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import WinList from 'components/WinList'
import Shortcut from 'components/Shortcut'
import Toolbar from 'components/Toolbar'
import SettingsDialog from 'components/Toolbar/SettingsDialog'
import { useStore } from './hooks/useStore'
import DragLayer from './DragLayer'
import { useTheme } from './hooks/useTheme'
import DroppableTools from './DroppableTools'
import { useLocation } from "react-router-dom";
import { NOT_POPUP } from 'libs'
import PopupView from './PopupView'

const useQuery = () => new URLSearchParams(useLocation().search)

export default observer(() => {
  const query = useQuery()
  const isPopup = !query.has(NOT_POPUP)
  const isDarkTheme = useTheme()
  const { windowStore, shortcutStore } = useStore()
  useEffect(() => {
    windowStore.didMount()
    shortcutStore.didMount()
    return () => shortcutStore.willUnmount()
  }, [])
  if (isPopup) {
    return (
      <PopupView />
    )
  }
  return (
    <main
      className={classNames(
        'flex flex-col h-screen overflow-hidden',
        isDarkTheme ? 'bg-charcoal text-white' : 'bg-white text-black'
      )}
    >
      <DroppableTools />
      <WinList />
      <Toolbar />
      <Shortcut />
      <SettingsDialog />
      <DragLayer />
    </main>
  )
})
