import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { observer } from 'mobx-react-lite'
import useSystemTheme from 'use-system-theme'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import { browser } from 'libs'
import { drawActionIcon, formatActionTabCountLabel } from 'libs/verify'
import tabManagerIcon from 'img/icon-128.png'
import tabManagerDarkIcon from 'img/icon-128-dark.png'
import { Example } from './SettingsExamples'

const popupWidth = 800
const popupHeight = 600

export default observer(function SettingsPopupPreview({
  onClose,
}: {
  onClose: () => void
}) {
  const { userStore } = useStore()
  const theme = useAppTheme()
  const dark = theme.mode === 'dark'
  const browserDark = useSystemTheme() === 'dark'
  const frameRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(0.5)
  const [counts, setCounts] = useState({
    tabCount: 23,
    currentWindowTabCount: 4,
  })
  const [ready, setReady] = useState(false)
  const settings = JSON.stringify({
    fontSize: userStore.fontSize,
    tabWidth: userStore.tabWidth,
    autoFitColumns: userStore.autoFitColumns,
    windowOrder: userStore.windowOrder,
    uiPreset: userStore.uiPreset,
    increaseContrast: userStore.increaseContrast,
    showUrl: userStore.showUrl,
    showTabIcon: userStore.showTabIcon,
    showTabTooltip: userStore.showTabTooltip,
    tabTooltipTitleLines: userStore.tabTooltipTitleLines,
    tabTooltipUrlLines: userStore.tabTooltipUrlLines,
    highlightDuplicatedTab: userStore.highlightDuplicatedTab,
    highlightActiveTabsInAllWindows: userStore.highlightActiveTabsInAllWindows,
    showUnmatchedTab: userStore.showUnmatchedTab,
    showAppWindow: userStore.showAppWindow,
    litePopupMode: userStore.litePopupMode,
    toolbarAutoHide: userStore.toolbarAutoHide,
    showShortcutHint: userStore.showShortcutHint,
    useSystemTheme: false,
    darkTheme: dark,
  })
  const sendPreferences = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: 'settings-preview:preferences', settings: JSON.parse(settings) },
      window.location.origin,
    )
  }, [settings])
  useEffect(sendPreferences, [sendPreferences])
  useEffect(() => {
    const onState = (event: MessageEvent) => {
      if (
        event.source !== frameRef.current?.contentWindow ||
        event.origin !== window.location.origin
      )
        return
      if (event.data?.type === 'settings-preview:escape') {
        onClose()
        return
      }
      if (event.data?.type !== 'settings-preview:state') return
      const { tabCount, currentWindowTabCount } = event.data
      if (
        !Number.isInteger(tabCount) ||
        tabCount < 0 ||
        !Number.isInteger(currentWindowTabCount) ||
        currentWindowTabCount < 0
      )
        return
      setReady(true)
      setCounts((previous) =>
        previous.tabCount === tabCount &&
        previous.currentWindowTabCount === currentWindowTabCount
          ? previous
          : { tabCount, currentWindowTabCount },
      )
    }
    window.addEventListener('message', onState)
    return () => window.removeEventListener('message', onState)
  }, [onClose])
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const measure = () => setScale(container.clientWidth / popupWidth)
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    resizeObserver?.observe(container)
    window.addEventListener('resize', measure)
    measure()
    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  const count =
    userStore.actionTabCountMode === 'currentWindow'
      ? counts.currentWindowTabCount
      : counts.tabCount
  const label =
    userStore.actionTabCountMode === 'off'
      ? null
      : formatActionTabCountLabel(count)
  useEffect(() => {
    const canvas = iconRef.current
    if (!canvas) return
    let cancelled = false
    const bitmap = new Image()
    bitmap.onload = () => {
      if (cancelled) return
      const size = Math.round(19 * window.devicePixelRatio)
      canvas.width = size
      canvas.height = size
      drawActionIcon(canvas, bitmap, size, label, browserDark)
    }
    bitmap.src = browserDark ? tabManagerDarkIcon : tabManagerIcon
    return () => {
      cancelled = true
    }
  }, [browserDark, label])
  return (
    <div data-testid="settings-popup-preview">
      <Example label="browser and popup">
        <div
          className="settings-browser-preview"
          data-browser-theme={browserDark ? 'dark' : 'light'}
        >
          <div className="settings-browser-titlebar" aria-hidden="true">
            <span className="settings-browser-traffic-lights">
              <i />
              <i />
              <i />
            </span>
            <span>Project notes</span>
          </div>
          <div className="settings-browser-addressbar">
            <span className="settings-browser-address" aria-hidden="true">
              notes.example.test/project
            </span>
            <canvas
              ref={iconRef}
              className="settings-browser-extension-icon"
              role="img"
              aria-label={
                label === null
                  ? 'Extension icon without tab count'
                  : `Extension icon: ${count} sample tabs`
              }
              data-testid="settings-preview-icon-count"
              data-count={label}
            />
          </div>
          <div className="settings-browser-scene">
            <div
              ref={containerRef}
              className="settings-popup-frame"
              style={{ height: popupHeight * scale + 2 }}
            >
              <iframe
                ref={frameRef}
                title="Sample Tab Manager popup"
                tabIndex={0}
                src={`${browser.runtime.getURL('settings-preview.html')}?not_popup=1`}
                onLoad={sendPreferences}
                className="settings-popup-iframe"
                style={{
                  width: popupWidth,
                  height: popupHeight,
                  transform: `scale(${scale})`,
                }}
              />
            </div>
          </div>
        </div>
      </Example>
      <p className="settings-preview-hint">
        {userStore.litePopupMode ? 'Lite popup' : 'Full popup'} · Fictional
        sample tabs.{' '}
        {userStore.litePopupMode
          ? 'Lite controls stay visible.'
          : 'Hover or focus the popup’s lower-right corner to try its toolbar.'}
      </p>
      <button
        type="button"
        className="settings-preview-hint-button"
        disabled={!ready || !userStore.showShortcutHint}
        onClick={() =>
          frameRef.current?.contentWindow?.postMessage(
            { type: 'settings-preview:hint' },
            window.location.origin,
          )
        }
      >
        Show sample shortcut hint
      </button>
    </div>
  )
})
