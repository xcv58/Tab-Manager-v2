import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { observer } from 'mobx-react-lite'
import { reaction } from 'mobx'
import App from 'components/App'
import Tools from 'components/Tools'
import WinList from 'components/WinList'
import Toolbar from 'components/Toolbar'
import PopupView from 'components/PopupView'
import Hint from 'components/Shortcut/Hint'
import { store, useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import { getUiColorTokens } from 'libs/uiColorTokens'
import { getDemoSnapshot, subscribeDemo } from './demo/browser'
import { sanitizePreferences } from './demo/preferences'
import '../css/popup.css'
import '../css/settings-preview.css'
import '@pigment-css/react/styles.css'

const sendState = () => {
  const { windows, storage } = getDemoSnapshot()
  const current = windows.find(
    (win) => win.id === storage.local.lastFocusedWindowId,
  )
  window.parent.postMessage(
    {
      type: 'settings-preview:state',
      tabCount: windows.reduce((count, win) => count + win.tabs.length, 0),
      currentWindowTabCount: current?.tabs.length ?? 0,
    },
    window.location.origin,
  )
}

window.addEventListener('message', async (event) => {
  if (event.source !== window.parent || event.origin !== window.location.origin)
    return
  if (event.data?.type === 'settings-preview:preferences') {
    await store.userStore.initPromise
    const settings = sanitizePreferences(event.data.settings)
    // These writes go only to the frame's in-memory adapter, including in the
    // installed extension. Use the normal setting path for toolbar/layout state.
    await store.userStore.writeSettings({
      ...settings,
      autoFocusSearch: false,
      preserveSearch: false,
      searchHistory: false,
      showSearchResultMenu: true,
    })
    await store.userStore.init()
    if (!store.userStore.showShortcutHint) store.shortcutStore.closeToast()
    sendState()
  } else if (event.data?.type === 'settings-preview:hint') {
    if (store.userStore.showShortcutHint)
      store.shortcutStore.showMoveHint('Space: Select tab')
  }
})

const PreviewPopup = observer(function PreviewPopup() {
  const { userStore, windowStore, tabGroupStore, shortcutStore } = useStore()
  const theme = useAppTheme()
  const colors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  useEffect(() => {
    tabGroupStore?.didMount?.()
    windowStore.didMount()
    shortcutStore.didMount()
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      window.parent.postMessage(
        { type: 'settings-preview:escape' },
        window.location.origin,
      )
    }
    document.addEventListener('keydown', onEscape)
    const unsubscribe = subscribeDemo(sendState)
    const dispose = reaction(
      () => !windowStore.initialLoading && userStore.loaded,
      (ready) => {
        if (ready) sendState()
      },
      { fireImmediately: true },
    )
    return () => {
      unsubscribe()
      dispose()
      document.removeEventListener('keydown', onEscape)
      shortcutStore.willUnmount()
      windowStore.willUnmount()
      tabGroupStore?.willUnmount?.()
    }
  }, [windowStore, tabGroupStore, userStore, shortcutStore])
  useEffect(() => {
    document.documentElement.style.fontSize = `${userStore.fontSize}px`
  }, [userStore.fontSize])
  useEffect(() => {
    // Application overlays belong to the enclosing Settings view, not a second
    // Settings/palette nested inside its illustrative popup.
    return reaction(
      () =>
        userStore.dialogOpen ||
        store.shortcutStore.dialogOpen ||
        store.actionStore.paletteOpen,
      (open) => {
        if (!open) return
        if (userStore.dialogOpen) userStore.closeDialog()
        if (store.shortcutStore.dialogOpen) store.shortcutStore.closeDialog()
        store.actionStore.closePalette()
        if (userStore.showShortcutHint)
          store.shortcutStore.showMoveHint(
            'Use the controls beside this sample popup',
          )
      },
    )
  }, [userStore])
  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        paddingBottom: userStore.litePopupMode ? 0 : 44,
        backgroundColor: colors.appCanvasSurface,
        color: colors.primaryText,
      }}
    >
      {userStore.litePopupMode ? (
        <PopupView autoFocus={false} />
      ) : (
        <>
          <Tools showSearchResultMenu />
          <WinList />
          <Toolbar />
        </>
      )}
      <Hint />
    </div>
  )
})

createRoot(document.getElementById('app-container')!).render(
  <App>
    <PreviewPopup />
  </App>,
)
