import React, { useLayoutEffect, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import { getUiColorTokens } from 'libs/uiColorTokens'
import {
  CloseIcon,
  MoreHorizIcon,
  SettingsSharpIcon,
  HelpIcon,
  RefreshIcon,
  KeyboardArrowLeftIcon,
} from 'icons/materialIcons'
import TabRowPreview, { TabRowsPreview } from './TabRowPreview'
import tabManagerIcon from 'img/icon-128.png'
import tabManagerDarkIcon from 'img/icon-128-dark.png'
import { getActionCountLayout } from 'libs/verify'

function Example({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  const { userStore } = useStore()
  const theme = useAppTheme()
  const colors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  return (
    <div
      data-settings-example
      className="settings-example mt-3 min-w-0 border overflow-hidden"
      style={{
        borderColor: colors.toolbarShellBorderColor,
        borderRadius: 6,
        backgroundColor: colors.settingsPreviewSurface,
      }}
    >
      <div className="settings-preview-label">Preview · {label}</div>
      {children}
    </div>
  )
}

export const WindowLayoutExample = observer(function WindowLayoutExample() {
  const { userStore } = useStore()
  const theme = useAppTheme()
  const colors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const container = ref.current
    if (!container) return
    const measure = () => setWidth(container.clientWidth)
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(container)
    window.addEventListener('resize', measure)
    measure()
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  const windows = [
    {
      id: 9250,
      title: 'Project documentation',
      url: 'https://react.dev/learn',
      recent: 1,
    },
    {
      id: 9251,
      title: 'Design review',
      url: 'https://www.figma.com/',
      recent: 3,
    },
    {
      id: 9252,
      title: 'Research reading',
      url: 'https://developer.mozilla.org/',
      recent: 2,
    },
    ...(userStore.showAppWindow
      ? [
          {
            id: 9253,
            title: 'Music · App window',
            url: 'https://music.youtube.com/',
            recent: 2,
          },
        ]
      : []),
  ]
  if (userStore.windowOrder === 'lastUsed')
    windows.sort((a, b) => b.recent - a.recent)
  const minimum = Math.round(userStore.tabWidth * userStore.fontSize)
  const count = userStore.autoFitColumns
    ? Math.max(1, Math.min(windows.length, Math.floor(width / minimum) || 1))
    : windows.length
  const columnWidth = Math.max(minimum, Math.floor(width / count))
  return (
    <Example label="sample windows">
      <div
        ref={ref}
        style={{
          overflowX: userStore.autoFitColumns ? 'hidden' : 'auto',
          maxHeight: 240,
        }}
      >
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns:
              'repeat(' + count + ', ' + Math.max(1, columnWidth - 4) + 'px)',
          }}
        >
          {windows.map((win) => (
            <div
              key={win.id}
              className="border overflow-hidden"
              style={{
                borderColor: colors.toolbarShellBorderColor,
                borderRadius: userStore.uiPreset === 'classic' ? 0 : 4,
              }}
            >
              <div
                className="px-2 py-1 text-xs truncate"
                style={{ backgroundColor: colors.headerSurface }}
              >
                1 tab · {win.title}
              </div>
              <TabRowPreview
                config={{
                  ...win,
                  fontSize: userStore.fontSize,
                  uiPreset: userStore.uiPreset,
                  increaseContrast: userStore.increaseContrast,
                  showTabIcon: true,
                  showUrl: true,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </Example>
  )
})

// Measure the sticky heading so a large reading size never obscures the preview.
export function SettingsPreviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [headingHeight, setHeadingHeight] = useState(0)
  useLayoutEffect(() => {
    const heading = ref.current
      ?.closest('.settings-section')
      ?.querySelector<HTMLElement>('.settings-section-heading')
    if (!heading) return
    const measure = () =>
      setHeadingHeight(heading.getBoundingClientRect().height)
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    resizeObserver?.observe(heading)
    window.addEventListener('resize', measure)
    measure()
    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  return (
    <div
      ref={ref}
      className="settings-preview-layout"
      style={
        {
          '--settings-preview-top': headingHeight + 12 + 'px',
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}

export const TabDetailsPreview = observer(function TabDetailsPreview() {
  const { userStore } = useStore()
  const theme = useAppTheme()
  const colors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  const common = {
    fontSize: userStore.fontSize,
    uiPreset: userStore.uiPreset,
    increaseContrast: userStore.increaseContrast,
    highlightActiveTabsInAllWindows: userStore.highlightActiveTabsInAllWindows,
    showDuplicateMarker: userStore.highlightDuplicatedTab,
    showTabIcon: userStore.showTabIcon,
    showUrl: userStore.showUrl,
    showTabTooltip: userStore.showTabTooltip,
    tabTooltipUrlLines: userStore.tabTooltipUrlLines,
    lastFocused: false,
  }
  return (
    <div data-testid="tab-details-shared-preview">
      <Example label="sample tabs">
        <div
          className="px-2 py-1 text-xs"
          style={{ backgroundColor: colors.headerSurface }}
        >
          3 tabs · Another window
        </div>
        <TabRowsPreview
          configs={[
            {
              ...common,
              id: 9100,
              title:
                'Active tab · Planning a workspace with long titles, detailed notes, and reference links across browser windows',
              url: 'https://github.com/xcv58/Tab-Manager-v2/issues/2658?preview=tooltip-url-length&theme=dark&style=classic&contrast=increased&show=long-query-parameters&source=settings-preview',
              active: true,
            },
            ...[9101, 9102].map((id) => ({
              ...common,
              id,
              title: 'Tab Manager issue tracker',
              url: 'https://github.com/xcv58/Tab-Manager-v2/issues/2580',
              duplicatedTabCount: 2,
            })),
          ]}
        />
      </Example>
      <p className="settings-preview-hint">
        Try selecting a sample tab. Hover or press Alt+↓ on a tab for its
        tooltip.
      </p>
    </div>
  )
})

export const ToolbarExample = observer(function ToolbarExample() {
  const { userStore } = useStore()
  const theme = useAppTheme()
  const colors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const visible = !userStore.toolbarAutoHide || hovered || focused
  return (
    <Example
      label={
        userStore.toolbarAutoHide
          ? 'Hover the example to reveal its toolbar'
          : 'toolbar stays visible'
      }
    >
      <div
        className="relative h-20"
        tabIndex={0}
        aria-label="Toolbar preview"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="absolute bottom-0 right-0 flex items-center gap-3 px-2"
          style={{
            height: 40,
            backgroundColor: colors.toolbarShellBackground,
            borderTop: '1px solid ' + colors.toolbarShellBorderColor,
            borderLeft: '1px solid ' + colors.toolbarShellBorderColor,
            borderTopLeftRadius: colors.toolbarShellBorderRadius,
          }}
        >
          {visible ? (
            <>
              <SettingsSharpIcon fontSize={18} />
              <HelpIcon fontSize={18} />
              <RefreshIcon fontSize={18} />
              <MoreHorizIcon fontSize={18} />
              <CloseIcon fontSize={18} />
            </>
          ) : (
            <KeyboardArrowLeftIcon fontSize={18} />
          )}
        </div>
      </div>
    </Example>
  )
})

export const ExtensionIconExample = observer(function ExtensionIconExample() {
  const { userStore } = useStore()
  const theme = useAppTheme()
  const dark = theme.mode === 'dark'
  const count = userStore.actionTabCountMode === 'currentWindow' ? '12' : '36'
  const layout = getActionCountLayout(28, count)
  return (
    <Example label="browser extension icon">
      <div className="flex items-center gap-3 px-3 py-3 text-sm">
        <span
          className="relative inline-flex shrink-0 items-center justify-center"
          style={{ width: 28, height: 28 }}
        >
          <img
            src={dark ? tabManagerDarkIcon : tabManagerIcon}
            alt="Tab Manager extension icon"
            style={{ width: 28, height: 28 }}
          />
          {userStore.actionTabCountMode !== 'off' && (
            <span
              className="absolute flex items-center justify-center"
              style={{
                left: layout.overlayInsetLeft,
                right: layout.overlayInsetRight,
                bottom: layout.overlayBottomInset,
                height: layout.overlayHeight,
                borderRadius: layout.borderRadius,
                fontSize: layout.fontSize,
                fontWeight: layout.fontWeight,
                backgroundColor: dark ? '#e0e7ff' : '#1d4ed8',
                color: dark ? '#1f2350' : '#fff',
              }}
            >
              {count}
            </span>
          )}
        </span>
        <span>
          {userStore.actionTabCountMode === 'off'
            ? 'No count shown'
            : userStore.actionTabCountMode === 'currentWindow'
              ? '12 tabs in this window'
              : '36 tabs across all windows'}
        </span>
      </div>
    </Example>
  )
})
