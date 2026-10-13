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
import TabRowPreview from './TabRowPreview'
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
        borderRadius: userStore.uiPreset === 'classic' ? 0 : 6,
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

const SearchExample = observer(function SearchExample({
  mode,
}: {
  mode: 'results' | 'history' | 'filtering'
}) {
  const { userStore } = useStore()
  const theme = useAppTheme()
  const colors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  const showResults = mode !== 'results' || userStore.showSearchResultMenu
  return (
    <Example
      label={
        mode === 'history'
          ? 'browser history results'
          : mode === 'results'
            ? 'full-page search results'
            : 'matching and non-matching tabs'
      }
    >
      <div
        className="mx-2 mb-2 rounded border px-2 py-1 text-sm"
        style={{
          borderColor: colors.toolbarShellBorderColor,
          borderRadius: userStore.uiPreset === 'classic' ? 0 : 4,
        }}
      >
        React
      </div>
      {showResults && (
        <div
          className="mx-2 mb-2 rounded border overflow-hidden"
          style={{
            borderColor: colors.toolbarShellBorderColor,
            borderRadius: userStore.uiPreset === 'classic' ? 0 : 4,
          }}
        >
          <TabRowPreview
            config={{
              id: 9260,
              fontSize: userStore.fontSize,
              title: 'React documentation',
              url: 'https://react.dev/learn',
              uiPreset: userStore.uiPreset,
              increaseContrast: userStore.increaseContrast,
              showTabIcon: true,
              showUrl: true,
            }}
          />
          {mode === 'filtering' && userStore.showUnmatchedTab && (
            <TabRowPreview
              className="opacity-40"
              config={{
                id: 9261,
                fontSize: userStore.fontSize,
                title: 'MDN Web Docs',
                url: 'https://developer.mozilla.org/',
                uiPreset: userStore.uiPreset,
                increaseContrast: userStore.increaseContrast,
                showTabIcon: true,
                showUrl: true,
              }}
            />
          )}
          {mode === 'history' && userStore.searchHistory && (
            <div
              className="border-t px-2 py-2 text-sm"
              style={{
                borderColor: colors.toolbarShellBorderColor,
                borderRadius: userStore.uiPreset === 'classic' ? 0 : 4,
              }}
            >
              <div className="text-xs opacity-70">Browser history</div>React
              guide you visited
            </div>
          )}
        </div>
      )}
    </Example>
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

type SearchPreviewMode = 'history' | 'results' | 'filtering'

export function SearchSettingsPreview({
  children,
}: {
  children: React.ReactNode
}) {
  const [mode, setMode] = useState<SearchPreviewMode>('history')
  const available = React.Children.toArray(children).flatMap((node) =>
    React.isValidElement<{ searchPreview?: SearchPreviewMode }>(node) &&
    node.props.searchPreview
      ? [node.props.searchPreview]
      : [],
  )
  const current = available.includes(mode) ? mode : available[0]
  const inspect = (target: EventTarget) => {
    if (!(target instanceof Element)) return
    const preview = target.closest<HTMLElement>(
      '[data-settings-search-preview]',
    )?.dataset.settingsSearchPreview
    if (preview) setMode(preview as SearchPreviewMode)
  }
  return (
    <div className={`settings-search-options ${current ? 'has-preview' : ''}`}>
      <div
        className="settings-options"
        onMouseOver={(event) => inspect(event.target)}
        onFocusCapture={(event) => inspect(event.target)}
      >
        {children}
      </div>
      {current && (
        <div className="settings-context-preview">
          <SearchExample mode={current} />
        </div>
      )}
    </div>
  )
}

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
