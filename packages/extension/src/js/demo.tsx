import React from 'react'
import { createRoot } from 'react-dom/client'
import { reaction } from 'mobx'
import App from 'components/App'
import { store } from 'components/hooks/useStore'
import { addDemoTab, getDemoState, subscribeDemo } from './demo/browser'
import '../css/popup.css'
import '@pigment-css/react/styles.css'
import '../css/demo-workspace.css'

// The adapter has already read the scenario hash. Use the normal full-page URL
// so existing tab activation and popup-closing logic keeps this page open.
window.history.replaceState(null, '', `${window.location.pathname}?not_popup=1`)

let failed = false
const sendState = () => {
  if (failed || store.windowStore.initialLoading || !store.userStore.loaded)
    return
  const state = getDemoState()
  window.parent.postMessage(
    {
      type: 'demo:state',
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
  if (event.data?.type === 'demo:add-tab')
    void addDemoTab().catch(sendActionError)
  if (event.data?.type === 'demo:theme') {
    const theme = event.data.theme === 'dark' ? 'dark' : 'light'
    if (store.userStore.theme !== theme) store.userStore.selectTheme(theme)
  }
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

createRoot(document.getElementById('app-container')!).render(
  <DemoBoundary>
    <App />
  </DemoBoundary>,
)
