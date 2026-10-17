import React from 'react'
import { installSafariPopupFocus } from './popupFocus'
import { createRoot } from 'react-dom/client'
import '../../css/popup.css'
import '@pigment-css/react/styles.css'

const root = createRoot(document.getElementById('app-container')!)
function StartupError({ message }: { message: string }) {
  return (
    <div className="p-6 text-sm" role="alert">
      <h1 className="mb-3 text-lg font-bold">Tab Manager could not open</h1>
      <p className="mb-3">{message}</p>
      <button
        className="rounded border px-3 py-2"
        onClick={() => location.reload()}
      >
        Try again
      </button>
    </div>
  )
}
class SafariBoundary extends React.Component<
  React.PropsWithChildren,
  { error: string }
> {
  state = { error: '' }
  static getDerivedStateFromError(error: Error) {
    return { error: error.message }
  }
  render() {
    return this.state.error ? (
      <StartupError message={this.state.error} />
    ) : (
      this.props.children
    )
  }
}
void Promise.resolve()
  // Catch module initialization failures in StartupError before mounting App.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  .then(() => require('components/App').default)
  .then((App) => {
    // Keep store initialization inside the same guarded startup sequence.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { store } = require('components/hooks/useStore')
    installSafariPopupFocus(store)
    root.render(
      <SafariBoundary>
        <App />
      </SafariBoundary>,
    )
  })
  .catch((error) => root.render(<StartupError message={error.message} />))
