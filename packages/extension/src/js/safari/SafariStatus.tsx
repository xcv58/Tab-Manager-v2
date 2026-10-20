import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import { browser } from 'libs'
import { safariState } from './state'

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
  return (
    <>
      {safariState.error && (
        <div
          data-safari-action-controls
          role="alert"
          className="flex shrink-0 items-center gap-3 border-b px-3 py-2 text-sm"
        >
          <span className="flex-1">{safariState.error}</span>
          <a href={process.env.SAFARI_HOST_APP_URL} className="underline">
            Safari access
          </a>
          <button onClick={retry} className="underline">
            Refresh
          </button>
          <button onClick={safariState.dismissError} className="underline">
            Dismiss
          </button>
        </div>
      )}
    </>
  )
})
