import React, { useEffect, lazy } from 'react'
import { observer } from 'mobx-react-lite'
import classNames from 'classnames'
import { useAppTheme } from 'libs/appTheme'
import WinList from 'components/WinList'
import Shortcut from 'components/Shortcut'
import Toolbar from 'components/Toolbar'
import { useStore, useFontSize } from './hooks/useStore'
import DragLayer from './DragLayer'
import { useTextClasses } from './hooks/useTheme'
import DroppableTools from './DroppableTools'
import { NOT_POPUP } from 'libs'
import PopupView from './PopupView'
import { getUiColorTokens } from 'libs/uiColorTokens'
import DeferredContent from './DeferredContent'

const CommandPalette = lazy(() => import('./CommandPalette'))

const SettingsDialog = lazy(() => import('./Toolbar/SettingsDialog'))

export default observer(() => {
  const isPopup = !new URLSearchParams(window.location.search).has(NOT_POPUP)
  const theme = useAppTheme()
  const { windowStore, shortcutStore, tabGroupStore, userStore, actionStore } =
    useStore()
  const { litePopupMode } = userStore
  const liteMode = isPopup && litePopupMode
  // The preference applies only to the full-page view; popup results stay on.
  const showSearchResultMenu = isPopup || userStore.showSearchResultMenu
  const fontSize = useFontSize()
  const uiColors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  useEffect(() => {
    tabGroupStore?.didMount?.()
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
        useTextClasses(),
      )}
      data-increase-contrast={userStore.increaseContrast ? 'true' : 'false'}
      style={{
        paddingBottom: liteMode ? 0 : 44,
        backgroundColor: uiColors.appCanvasSurface,
        color: theme.palette.text.primary,
      }}
    >
      {liteMode ? (
        <PopupView />
      ) : (
        <>
          <DroppableTools showSearchResultMenu={showSearchResultMenu} />
          <WinList />
          <Toolbar />
          <DragLayer />
        </>
      )}
      <Shortcut />
      <DeferredContent open={actionStore.paletteOpen}>
        <CommandPalette />
      </DeferredContent>
      <DeferredContent open={userStore.dialogOpen}>
        <SettingsDialog />
      </DeferredContent>
    </main>
  )
})
