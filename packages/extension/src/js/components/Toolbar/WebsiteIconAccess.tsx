import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import { websiteIcons } from 'libs/websiteIcons'
import { websiteOriginPattern } from 'libs/websiteOriginPattern'

export default observer(function WebsiteIconAccess() {
  const { userStore, windowStore } = useStore()
  const [missing, setMissing] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [revision, setRevision] = React.useState(0)
  const ref = React.useRef<HTMLDivElement>(null)
  const request = React.useRef(0)
  const descriptionId = React.useId()
  // Keep exact page URLs so the adapter can include an icon host discovered on
  // that page. Only normal HTTP(S) tabs participate; no browser history reads.
  const urlsKey = JSON.stringify(
    [
      ...new Set(
        windowStore.tabs
          .filter((tab) => !tab.incognito && websiteOriginPattern(tab.url))
          .map((tab) => tab.url),
      ),
    ].sort(),
  )
  const enabled = userStore.showTabIcon
  const updateMissing = (value: boolean) => {
    if (!value && ref.current?.contains(document.activeElement)) {
      ref.current
        .closest('.settings-option')
        ?.querySelector<HTMLInputElement>('input')
        ?.focus({ preventScroll: true })
    }
    setMissing(value)
  }
  React.useEffect(
    () => () => {
      request.current++
    },
    [],
  )
  React.useEffect(() => {
    request.current++
    setBusy(false)
    setMessage('')
  }, [enabled, urlsKey])
  React.useEffect(
    () =>
      websiteIcons?.subscribe(() => {
        setRevision((value) => value + 1)
      }),
    [],
  )
  React.useEffect(() => {
    let current = true
    if (!enabled || !websiteIcons) {
      setMissing(false)
      return
    }
    const urls: string[] = JSON.parse(urlsKey)
    if (!urls.length) {
      setMissing(false)
      return
    }
    void websiteIcons
      .hasAccess(urls)
      .then((allowed) => {
        if (current) updateMissing(!allowed)
      })
      .catch(() => {
        // An unavailable permission API is not evidence of missing permission.
        if (current) setMissing(false)
      })
    return () => {
      current = false
    }
  }, [enabled, urlsKey, revision])
  const requestAccess = async () => {
    if (busy || !websiteIcons) return
    const current = ++request.current
    setBusy(true)
    setMessage('')
    try {
      // Keep the permission request in the original click gesture: no awaited
      // tab lookup or permission check before invoking Safari's prompt.
      const granted = await websiteIcons.requestAccess(JSON.parse(urlsKey))
      const allowed = await websiteIcons.hasAccess(JSON.parse(urlsKey))
      if (request.current !== current) return
      updateMissing(!allowed)
      if (!granted || !allowed)
        setMessage(
          'Access was not granted for every website. Tabs without an available icon use the default icon.',
        )
    } catch {
      if (request.current === current)
        setMessage(
          'Safari could not request website access. You can allow it in Safari Settings below.',
        )
    } finally {
      if (request.current === current) setBusy(false)
    }
  }
  if (!enabled || !missing) return null
  return (
    <div
      ref={ref}
      className="mt-2 text-sm"
      data-testid="website-icon-access"
      style={{ color: 'var(--settings-muted)' }}
    >
      <p id={descriptionId} className="m-0">
        {websiteIcons?.isDemo
          ? 'Preview Safari website access with sample icons. No websites are contacted.'
          : 'Allow website access in Safari to display website icons.'}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void requestAccess()}
        aria-describedby={descriptionId}
        className="mt-2 rounded border border-slate-300 px-3 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        {busy ? 'Waiting for website access…' : 'Allow website access'}
      </button>
      {!websiteIcons?.isDemo && (
        <details className="mt-2">
          <summary className="cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
            How to allow access
          </summary>
          <p className="mt-1 mb-0">
            In Safari Settings → Extensions → Tab Manager v2 → Edit Websites,
            choose Allow for the websites you want. If a site uses a separate
            icon host, it also needs access. Missing or unavailable icons use
            the default icon.
          </p>
        </details>
      )}
      <p role="status" className="mt-1 mb-0">
        {message}
      </p>
    </div>
  )
})
