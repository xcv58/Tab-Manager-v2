import React from 'react'
import { createRoot } from 'react-dom/client'
import { reaction } from 'mobx'
import App from 'components/App'
import { setPopupModeOverride } from 'libs/popupMode'
import { store } from 'components/hooks/useStore'
import { addDemoTab, getDemoState, subscribeDemo } from './demo/browser'
import '../css/popup.css'
import '@pigment-css/react/styles.css'
import '../css/demo-workspace.css'

// The adapter has already read the scenario hash. Full-page mode keeps normal
// demo activation from closing this page; popup preview explicitly exercises
// the shared popup UI against the same isolated sample browser adapter.
let popupPreview = new URLSearchParams(window.location.search).has(
  'popup_preview',
)
const panel = new URLSearchParams(window.location.search).get('panel')
const panelQuery =
  panel === 'settings' || panel === 'shortcuts' ? `&panel=${panel}` : ''
window.history.replaceState(
  null,
  '',
  `${window.location.pathname}?${popupPreview ? 'popup_preview=1' : 'not_popup=1'}${panelQuery}${window.location.hash}`,
)

setPopupModeOverride(popupPreview)

let viewRequestId = 0
let failed = false
const sendState = () => {
  if (failed || store.windowStore.initialLoading || !store.userStore.loaded)
    return
  const state = getDemoState()
  window.parent.postMessage(
    {
      type: 'demo:state',
      view: popupPreview ? 'popup' : 'full',
      viewRequestId,
      state: {
        ...state,
        activity: state.activity[0]?.message,
      },
    },
    window.location.origin,
  )
}
const sendError = () => {
  failed = true
  window.parent.postMessage({ type: 'demo:error' }, window.location.origin)
}
const sendActionError = () => {
  if (store.windowStore.initialLoading || !store.userStore.loaded) {
    sendError()
    return
  }
  window.parent.postMessage(
    { type: 'demo:operation-error' },
    window.location.origin,
  )
}
subscribeDemo(sendState)
reaction(
  () => !store.windowStore.initialLoading && store.userStore.loaded,
  (ready) => {
    if (ready) sendState()
  },
  { fireImmediately: true },
)
window.addEventListener('unhandledrejection', sendActionError)
// In an ordinary web page Ctrl+R also refreshes the browser. Cancel that
// default only when the real extension shortcut is allowed to handle it.
document.addEventListener(
  'keydown',
  (event) => {
    if (
      event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey &&
      event.key.toLowerCase() === 'r' &&
      !store.shortcutStore.stopCallback(
        event,
        event.target as HTMLInputElement,
        'ctrl+r',
      )
    )
      event.preventDefault()
  },
  true,
)
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin || event.source !== window.parent)
    return
  if (
    event.data?.type === 'demo:set-view' &&
    (event.data.view === 'full' || event.data.view === 'popup') &&
    Number.isSafeInteger(event.data.viewRequestId) &&
    event.data.viewRequestId >= viewRequestId
  ) {
    viewRequestId = event.data.viewRequestId
    setView(event.data.view)
  }
  if (event.data?.type === 'demo:add-tab')
    void addDemoTab().catch(sendActionError)
})

class DemoBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    sendError()
  }
  render() {
    return this.state.failed ? (
      <p role="alert">The demo could not load. Use Start over to reset it.</p>
    ) : (
      this.props.children
    )
  }
}

const setView = (view: 'full' | 'popup') => {
  if (popupPreview !== (view === 'popup')) {
    store.actionStore.closeMenu()
    store.actionStore.closePalette(false)
    popupPreview = view === 'popup'
    const url = new URL(window.location.href)
    url.searchParams.delete('not_popup')
    url.searchParams.delete('popup_preview')
    url.searchParams.set(popupPreview ? 'popup_preview' : 'not_popup', '1')
    window.history.replaceState(null, '', url.href)
    setPopupModeOverride(popupPreview)
  }
  sendState()
}
window.addEventListener('demo:open-full-view', (event) => {
  setView('full')
  const panel = (event as CustomEvent<{ panel?: string }>).detail?.panel
  if (panel === 'settings') store.userStore.openDialog()
  else if (panel === 'shortcuts') store.shortcutStore.openDialog()
})
createRoot(document.getElementById('app-container')!).render(
  <DemoBoundary>
    <App />
  </DemoBoundary>,
)
