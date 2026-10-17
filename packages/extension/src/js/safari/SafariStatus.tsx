import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import { browser } from 'libs'
import { safariState, cancelSafariAction } from './state'

export default observer(function SafariStatus() {
  const { windowStore } = useStore()
  useEffect(() => {
    void browser.storage.local
      .get('safariLaunchError')
      .then(({ safariLaunchError }) => {
        if (typeof safariLaunchError === 'string' && safariLaunchError) {
          safariState.showError(new Error(safariLaunchError))
          void browser.storage.local.remove('safariLaunchError')
        }
      })
  }, [])
  const retry = async () => {
    safariState.dismissError()
    try {
      await windowStore.updateAllWindows()
    } catch (error) {
      safariState.showError(error)
    }
  }
  const progress = safariState.progress
  return (
    <>
      <div
        data-safari-action-controls
        className="flex shrink-0 items-center gap-3 border-b px-3 py-1 text-xs"
        style={{ minHeight: 28 }}
      >
        <span className="flex-1 opacity-70">
          This Safari profile · Active tab groups only · Private windows
          excluded
        </span>
        <a href={process.env.SAFARI_HOST_APP_URL} className="underline">
          Safari access
        </a>
      </div>
      {safariState.error && (
        <div
          data-safari-action-controls
          role="alert"
          className="flex shrink-0 items-center gap-3 border-b px-3 py-2 text-sm"
        >
          <span className="flex-1">{safariState.error}</span>
          <button onClick={retry} className="underline">
            Refresh
          </button>
          <button onClick={safariState.dismissError} className="underline">
            Dismiss
          </button>
        </div>
      )}
      {progress && progress.total > 1 && (
        <div
          data-safari-action-controls
          className="flex shrink-0 items-center gap-3 border-b px-3 py-2 text-sm"
        >
          <span role="status" aria-atomic="true" className="flex-1">
            {progress.state === 'queued' ? 'Waiting for Safari' : 'Working'} ·{' '}
            {progress.completed} of {progress.total} tabs
          </span>
          <button
            className="underline"
            title="Stop after current tab (⌘.)"
            aria-keyshortcuts="Meta+. Control+."
            onClick={() =>
              void cancelSafariAction().catch(safariState.showError)
            }
          >
            Stop after current tab
          </button>
        </div>
      )}
    </>
  )
})
