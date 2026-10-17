import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Dialog, { DialogContent, DialogTitle } from 'components/ui/Dialog'
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
  const closingWindow = safariState.closeWindow !== null
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
      <Dialog
        open={safariState.confirmationOpen}
        onClose={() => safariState.finishClose(false)}
        aria-labelledby="safari-close-title"
      >
        <DialogTitle>
          <span id="safari-close-title">
            {closingWindow
              ? 'Close this Safari window?'
              : `Close ${safariState.closeIDs.size} ${safariState.closeIDs.size === 1 ? 'tab' : 'tabs'}?`}
          </span>
        </DialogTitle>
        <DialogContent>
          {closingWindow
            ? 'Safari will close the entire window, not just the tabs shown here. It may contain tabs in inactive groups that Tab Manager cannot display.'
            : 'Review your selection before closing. Safari will recheck each tab before the action.'}
        </DialogContent>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <button
            className="rounded border px-3 py-2"
            onClick={() => safariState.finishClose(false)}
          >
            Cancel
          </button>
          <button
            className="rounded border px-3 py-2 text-red-600"
            onClick={() => safariState.finishClose(true)}
          >
            {closingWindow ? 'Close window' : 'Close tabs'}
          </button>
        </div>
      </Dialog>
    </>
  )
})
