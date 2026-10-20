import React from 'react'
import { observer } from 'mobx-react-lite'
import Switch from 'components/ui/Switch'
import { useStore } from 'components/hooks/useStore'
import { websiteIcons } from 'libs/websiteIcons'

export default observer(function WebsiteIconOption({
  style,
}: {
  style: React.CSSProperties
}) {
  const { userStore, windowStore } = useStore()
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const id = React.useId()
  const descriptionId = React.useId()
  if (!websiteIcons) return null
  const requestAccess = async () => {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      // Do not await a tab query here: Safari requires the original user gesture.
      const granted = await websiteIcons.requestAccess(
        windowStore.tabs.filter((tab) => !tab.incognito).map((tab) => tab.url),
      )
      if (granted) {
        await userStore.setLoadWebsiteIcons(true)
        setMessage(
          websiteIcons.isDemo
            ? 'Sample icons enabled. No websites were contacted.'
            : 'Allowed websites can now show their icons. Other tabs keep initials.',
        )
      } else {
        setMessage(
          'Website access was not granted. Initials will be used where access is unavailable.',
        )
      }
    } catch {
      setMessage(
        'Website access is unavailable. Tabs will keep their initials.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div
      className="settings-option"
      style={style}
      data-testid="website-icon-option"
    >
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="min-w-0 cursor-pointer">
          <h5 className="m-0 text-base font-semibold">Load website icons</h5>
        </label>
        <Switch
          size="settings"
          checked={userStore.loadWebsiteIcons}
          onChange={() => {
            if (userStore.loadWebsiteIcons) {
              void userStore.setLoadWebsiteIcons(false)
              setMessage('')
            } else void requestAccess()
          }}
          inputProps={{
            id,
            disabled: busy,
            'aria-label': 'Load website icons',
            'aria-describedby': descriptionId,
          }}
        />
      </div>
      <p
        id={descriptionId}
        className="mt-1 mb-0 text-sm"
        style={{ color: 'var(--settings-muted)' }}
      >
        {websiteIcons.isDemo
          ? 'Safari icon preview: switch between local initials and sample icons. No website access or network requests.'
          : 'Off by default. Allow the open websites to read icon links and download icons from those sites, without cookies. Missing or inaccessible icons keep local initials. Private tabs are excluded.'}
      </p>
      {userStore.loadWebsiteIcons && !websiteIcons.isDemo && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void requestAccess()}
          className="mt-2 rounded border border-slate-300 px-3 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          Allow open websites
        </button>
      )}
      <p
        role="status"
        className="mt-1 mb-0 text-sm"
        style={{ color: 'var(--settings-muted)' }}
      >
        {busy ? 'Waiting for website access…' : message}
      </p>
    </div>
  )
})
