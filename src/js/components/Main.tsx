import React, { useEffect, useRef } from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import WinList from 'components/WinList'
import Shortcut from 'components/Shortcut'
import Toolbar from 'components/Toolbar'
import SettingsDialog from 'components/Toolbar/SettingsDialog'
import { useStore } from './StoreContext'
import DragLayer from './DragLayer'
import { useTheme } from './ThemeContext'
import DroppableTools from './DroppableTools'

export default observer(() => {
  const searchEl = useRef<HTMLInputElement>(null)
  const isDarkTheme = useTheme()
  const { windowStore, shortcutStore } = useStore()
  useEffect(() => {
    windowStore.didMount()
    shortcutStore.didMount(searchEl)
    return () => shortcutStore.willUnmount()
  }, [])
  return (
    <main
      className={classNames(
        'flex flex-col h-screen overflow-hidden',
        isDarkTheme ? 'bg-charcoal text-white' : 'bg-white text-black'
      )}
    >
      <DroppableTools inputRef={searchEl} />
      <WinList />
      <Toolbar />
      <Shortcut />
      <SettingsDialog />
      <DragLayer />
    </main>
  )
})
