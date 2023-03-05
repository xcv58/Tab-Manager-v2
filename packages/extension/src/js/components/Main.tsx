import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import classNames from 'classnames'
import WinList from 'components/WinList'
import Shortcut from 'components/Shortcut'
import Toolbar from 'components/Toolbar'
import FontSizeUpdater from 'components/FontSizeUpdater'
import SettingsDialog from 'components/Toolbar/SettingsDialog'
import { useStore } from './hooks/useStore'
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
  const { windowStore, shortcutStore, userStore } = useStore()
  const { toolbarAutoHide, litePopupMode } = userStore
  const liteMode = isPopup && litePopupMode
  useEffect(() => {
    windowStore.didMount()
    shortcutStore.didMount()
    return () => shortcutStore.willUnmount()
  }, [])
  return (
    <main
      className={classNames(
        'flex flex-col h-screen overflow-hidden',
        { 'pb-12': !toolbarAutoHide },
        useTextClasses()
      )}
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
      <FontSizeUpdater />
    </main>
  )
})
