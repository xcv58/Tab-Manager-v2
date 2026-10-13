import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import { getUiColorTokens } from 'libs/uiColorTokens'
import { getActionCountLayout } from 'libs/verify'
import { SearchIcon } from 'icons/actionIcons'
import {
  CloseIcon,
  MoreHorizIcon,
  SettingsSharpIcon,
  HelpIcon,
  RefreshIcon,
  KeyboardArrowLeftIcon,
  LightModeRoundedIcon,
  DarkModeRoundedIcon,
} from 'icons/materialIcons'
import tabManagerIcon from 'img/icon-128.png'
import tabManagerDarkIcon from 'img/icon-128-dark.png'
import { Example, SampleWindowPreview } from './SettingsExamples'
import { previewWindows } from './SettingsPreviewData'
import { TabRowsPreview } from './TabRowPreview'

export default observer(function SettingsPopupPreview() {
  const { userStore } = useStore()
  const theme = useAppTheme()
  const dark = theme.mode === 'dark'
  const colors = getUiColorTokens(
    dark,
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  const [query, setQuery] = useState('')
  const [toolbarHovered, setToolbarHovered] = useState(false)
  const [toolbarFocused, setToolbarFocused] = useState(false)
  const [popupToolbarHovered, setPopupToolbarHovered] = useState(false)
  const [popupToolbarFocused, setPopupToolbarFocused] = useState(false)
  const [hint, setHint] = useState(0)
  useEffect(() => {
    if (!hint) return
    const timeout = window.setTimeout(() => setHint(0), 2500)
    return () => window.clearTimeout(timeout)
  }, [hint])
  const tabs = previewWindows.flatMap((win) => win.tabs)
  const filtered = tabs.filter((tab) =>
    `${tab.title} ${tab.url}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  )
  const count =
    userStore.actionTabCountMode === 'currentWindow'
      ? previewWindows[0].tabs.length
      : tabs.length
  const iconLayout = getActionCountLayout(24, String(count))
  const toolbarVisible =
    !userStore.toolbarAutoHide || toolbarHovered || toolbarFocused
  const popupToolbarVisible =
    !userStore.toolbarAutoHide || popupToolbarHovered || popupToolbarFocused
  return (
    <div data-testid="settings-popup-preview">
      <Example label="browser and popup">
        <div
          className="settings-browser-preview"
          style={{ backgroundColor: colors.appCanvasSurface }}
        >
          <div className="settings-browser-titlebar" aria-hidden="true">
            <span className="settings-browser-traffic-lights">
              <i />
              <i />
              <i />
            </span>
            <span>Tab Manager</span>
          </div>
          <div className="settings-browser-addressbar">
            <span className="settings-browser-address" aria-hidden="true">
              tab.jenny.media
            </span>
            <span
              className="settings-browser-extension-icon"
              role="img"
              aria-label={
                userStore.actionTabCountMode === 'off'
                  ? 'Extension icon without tab count'
                  : `Extension icon: ${count} tabs`
              }
              style={{ backgroundColor: dark ? '#334155' : '#fff' }}
            >
              <img
                src={dark ? tabManagerDarkIcon : tabManagerIcon}
                alt=""
                width={24}
                height={24}
              />
              {userStore.actionTabCountMode !== 'off' && (
                <span
                  data-testid="settings-preview-icon-count"
                  style={{
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    left: iconLayout.overlayInsetLeft,
                    right: iconLayout.overlayInsetRight,
                    bottom: iconLayout.overlayBottomInset,
                    height: iconLayout.overlayHeight,
                    borderRadius: iconLayout.borderRadius,
                    fontSize: iconLayout.fontSize,
                    fontWeight: iconLayout.fontWeight,
                    backgroundColor: dark ? '#e0e7ff' : '#1d4ed8',
                    color: dark ? '#1f2350' : '#fff',
                  }}
                >
                  {count}
                </span>
              )}
            </span>
          </div>
          <div className="settings-browser-scene">
            <div
              className="settings-browser-background"
              aria-hidden="true"
              style={{ color: colors.mutedText }}
            >
              <strong>
                {previewWindows.length} windows · {tabs.length} tabs
              </strong>
              {previewWindows[0].tabs.map((tab) => (
                <div key={tab.id}>{tab.title}</div>
              ))}
            </div>
            <div
              className="settings-popup-sample"
              data-lite-mode={userStore.litePopupMode}
              style={{
                backgroundColor: colors.windowCardSurface,
                color: colors.primaryText,
                borderColor: colors.windowCardBorderColor,
                borderRadius: userStore.uiPreset === 'classic' ? 0 : 6,
              }}
            >
              <div
                className="settings-popup-sample-summary"
                style={{ backgroundColor: colors.popupHeaderSurface }}
              >
                {previewWindows.length} windows · {tabs.length} tabs
              </div>
              <label className="settings-popup-sample-search">
                <SearchIcon fontSize={16} aria-hidden="true" />
                <input
                  aria-label="Search sample popup tabs"
                  placeholder="Search sample tabs…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div className="settings-popup-sample-results">
                {userStore.litePopupMode || query ? (
                  filtered.length ? (
                    <TabRowsPreview
                      configs={filtered.slice(0, 5).map((tab) => ({
                        ...tab,
                        id: tab.id + 3000,
                        fontSize: userStore.fontSize,
                        uiPreset: userStore.uiPreset,
                        increaseContrast: userStore.increaseContrast,
                        showTabIcon: userStore.showTabIcon,
                        showUrl: userStore.showUrl,
                      }))}
                    />
                  ) : (
                    <p className="settings-preview-caption">
                      No sample tabs match.
                    </p>
                  )
                ) : (
                  previewWindows.map((win) => (
                    <SampleWindowPreview
                      key={win.id}
                      win={win}
                      idOffset={3000}
                    />
                  ))
                )}
              </div>
              <div
                className="settings-popup-sample-footer"
                tabIndex={userStore.litePopupMode ? undefined : 0}
                role="group"
                aria-label="Popup toolbar preview"
                onMouseEnter={() => setPopupToolbarHovered(true)}
                onMouseLeave={() => setPopupToolbarHovered(false)}
                onFocus={() => setPopupToolbarFocused(true)}
                onBlur={() => setPopupToolbarFocused(false)}
                style={{
                  backgroundColor: colors.popupControlsSurface,
                  borderColor: colors.popupControlsBorderColor,
                  borderTopLeftRadius: colors.toolbarShellBorderRadius,
                }}
              >
                <span className="flex items-center gap-3" aria-hidden="true">
                  {userStore.litePopupMode ? (
                    <>
                      {dark ? (
                        <LightModeRoundedIcon fontSize={16} />
                      ) : (
                        <DarkModeRoundedIcon fontSize={16} />
                      )}
                      <MoreHorizIcon fontSize={16} />
                    </>
                  ) : popupToolbarVisible ? (
                    <>
                      <SettingsSharpIcon fontSize={16} />
                      <HelpIcon fontSize={16} />
                      <RefreshIcon fontSize={16} />
                      <MoreHorizIcon fontSize={16} />
                    </>
                  ) : (
                    <KeyboardArrowLeftIcon fontSize={16} />
                  )}
                </span>
              </div>
            </div>
            <div
              className="settings-preview-toolbar"
              data-testid="settings-preview-toolbar"
              data-visible={toolbarVisible}
              tabIndex={0}
              role="group"
              aria-label="Full-page toolbar preview"
              onMouseEnter={() => setToolbarHovered(true)}
              onMouseLeave={() => setToolbarHovered(false)}
              onFocus={() => setToolbarFocused(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node))
                  setToolbarFocused(false)
              }}
              style={{
                backgroundColor: colors.toolbarShellBackground,
                color: colors.primaryText,
                borderColor: colors.toolbarShellBorderColor,
                borderTopLeftRadius: colors.toolbarShellBorderRadius,
              }}
            >
              <span aria-hidden="true" className="flex items-center gap-3">
                {toolbarVisible ? (
                  <>
                    <SettingsSharpIcon fontSize={16} />
                    <HelpIcon fontSize={16} />
                    <RefreshIcon fontSize={16} />
                    <MoreHorizIcon fontSize={16} />
                    <CloseIcon fontSize={16} />
                  </>
                ) : (
                  <KeyboardArrowLeftIcon fontSize={16} />
                )}
              </span>
            </div>
            {hint > 0 && userStore.showShortcutHint && (
              <div className="settings-preview-shortcut-hint" role="status">
                Space · Select tab
              </div>
            )}
          </div>
        </div>
      </Example>
      <p className="settings-preview-hint">
        {userStore.litePopupMode
          ? 'Lite popup: search results without the window overview.'
          : 'Full popup: browse windows or search sample tabs.'}{' '}
        Icon count:{' '}
        {userStore.actionTabCountMode === 'off'
          ? 'off'
          : `${count} ${userStore.actionTabCountMode === 'currentWindow' ? 'in this window' : 'across all windows'}`}
        .
      </p>
      <p className="settings-preview-hint">
        Hover or focus the browser’s lower-right corner to try the full-page
        toolbar. Lite popup controls always stay visible.
      </p>
      <button
        type="button"
        className="settings-preview-hint-button"
        disabled={!userStore.showShortcutHint}
        onClick={() => setHint((value) => value + 1)}
      >
        Show sample shortcut hint
      </button>
      {!userStore.showShortcutHint && (
        <span className="settings-preview-hint ml-2">
          Shortcut hints are off.
        </span>
      )}
    </div>
  )
})
