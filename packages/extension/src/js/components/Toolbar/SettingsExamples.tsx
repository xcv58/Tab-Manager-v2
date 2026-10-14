import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import { getUiColorTokens } from 'libs/uiColorTokens'
import { TabRowsPreview } from './TabRowPreview'
import WindowStore from 'stores/WindowStore'
import { getWindowRowHeight } from 'libs/layoutMetrics'
import {
  previewWindows,
  previewAppWindow,
  previewIcon,
  type PreviewWindow,
} from './SettingsPreviewData'

export const Example = observer(function Example({
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
})

export const SampleWindowPreview = observer(function SampleWindowPreview({
  win,
  idOffset,
  lastFocused = false,
}: {
  win: PreviewWindow
  idOffset: number
  lastFocused?: boolean
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
      data-preview-window={win.id}
      className="settings-sample-window"
      style={{
        backgroundColor: colors.windowCardSurface,
        borderColor: colors.windowCardBorderColor,
        borderRadius: userStore.uiPreset === 'classic' ? 0 : 4,
      }}
    >
      <div
        className="settings-sample-window-heading"
        style={{
          height: getWindowRowHeight(userStore.fontSize) - 2,
          backgroundColor: colors.headerSurface,
        }}
      >
        <span>
          {win.tabs.length} tabs · {win.tabs[0].title}
        </span>
      </div>
      <TabRowsPreview
        configs={win.tabs.map((tab, index) => ({
          ...tab,
          id: tab.id + idOffset,
          active: index === 0,
          lastFocused,
          fontSize: userStore.fontSize,
          uiPreset: userStore.uiPreset,
          increaseContrast: userStore.increaseContrast,
          highlightActiveTabsInAllWindows:
            userStore.highlightActiveTabsInAllWindows,
          showDuplicateMarker: userStore.highlightDuplicatedTab,
          showTabIcon: userStore.showTabIcon,
          showUrl: userStore.showUrl,
        }))}
      />
    </div>
  )
})

export const AppearancePreview = observer(function AppearancePreview() {
  return (
    <div data-testid="settings-appearance-preview">
      <Example label="workspace appearance">
        <SampleWindowPreview
          win={{
            ...previewWindows[0],
            tabs: previewWindows[0].tabs.slice(0, 3),
          }}
          idOffset={1000}
          lastFocused
        />
      </Example>
      <p className="settings-preview-hint">
        Style, theme, contrast, and text size update this example immediately.
      </p>
    </div>
  )
})

const workspaceScale = 0.8

export const WindowLayoutExample = observer(function WindowLayoutExample() {
  const { userStore } = useStore()
  const ref = useRef<HTMLDivElement>(null)
  // Use the real packing calculations without mounting browser listeners or loading tabs.
  const layoutStore = useMemo(
    () => new WindowStore({ userStore } as never),
    [userStore],
  )
  useLayoutEffect(() => {
    const container = ref.current
    if (!container) return
    const measure = () =>
      runInAction(() => {
        layoutStore.width = container.clientWidth / workspaceScale
        layoutStore.height = container.clientHeight / workspaceScale
      })
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    resizeObserver?.observe(container)
    window.addEventListener('resize', measure)
    measure()
    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [layoutStore])
  const windows = [
    ...previewWindows,
    ...(userStore.showAppWindow ? [previewAppWindow] : []),
  ]
  const ordered =
    userStore.windowOrder === 'lastUsed'
      ? [...windows].sort((a, b) => b.recent - a.recent)
      : windows
  const layoutWindows = ordered.map((win) => ({
    id: win.id,
    visibleLength: win.tabs.length + 2,
  }))
  const { layout, columnCount } =
    userStore.windowOrder === 'lastUsed'
      ? layoutStore.computeColumnLayoutFromWindowIds(
          layoutWindows as never,
          ordered.map((win) => win.id),
        )
      : layoutStore.computeBaseColumnLayout(layoutWindows as never)
  const fluidWidth = layoutStore.width / columnCount
  const minimumWidth = Math.max(
    userStore.autoFitColumns ? Math.floor(fluidWidth) : fluidWidth,
    layoutStore.minColumnWidthPx,
  )
  const columnWidth = userStore.autoFitColumns
    ? minimumWidth
    : Math.round(minimumWidth)
  const rowHeight = getWindowRowHeight(userStore.fontSize)
  const height = Math.max(
    ...layout.map((ids) =>
      ids.reduce(
        (sum, id) =>
          sum +
          (windows.find((win) => win.id === id).tabs.length + 2) * rowHeight,
        0,
      ),
    ),
  )
  const count = windows.reduce((sum, win) => sum + win.tabs.length, 0)
  return (
    <div data-testid="settings-window-layout-preview">
      <Example label="sample workspace">
        <div className="settings-preview-caption">
          {windows.length} windows · {count} tabs · {columnCount}{' '}
          {columnCount === 1 ? 'column' : 'columns'}
        </div>
        <div
          ref={ref}
          className="settings-workspace-preview"
          tabIndex={0}
          aria-label="Sample window layout"
          style={{ overflowX: userStore.autoFitColumns ? 'hidden' : 'auto' }}
        >
          <div
            style={{
              width: columnCount * columnWidth * workspaceScale,
              height: height * workspaceScale,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                alignItems: 'start',
                gridTemplateColumns: `repeat(${columnCount}, ${columnWidth}px)`,
                width: columnCount * columnWidth,
                transform: `scale(${workspaceScale})`,
                transformOrigin: 'top left',
              }}
            >
              {layout.map((ids, index) => (
                <div key={index} style={{ padding: '0 2px' }}>
                  {ids.map((id) => (
                    <div key={id} style={{ marginBottom: rowHeight }}>
                      <SampleWindowPreview
                        win={windows.find((win) => win.id === id)}
                        idOffset={2000}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Example>
      <p className="settings-preview-hint">
        {userStore.autoFitColumns
          ? 'Columns fit this example. Scroll down to see the remaining windows.'
          : 'Scroll sideways to see the remaining windows, or turn on Auto-fit columns.'}
      </p>
    </div>
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
              iconUrl: previewIcon('N', '#0891b2'),
              title:
                'Active tab · Planning a workspace with long titles, detailed notes, and reference links across browser windows',
              url: 'https://notes.example.test/project/research?view=reference-library&topic=planning-a-workspace&sort=recently-updated&include=long-titles-and-detailed-notes&source=sample-preview',
              active: true,
            },
            ...[9101, 9102].map((id) => ({
              ...common,
              id,
              title: 'Project issue tracker',
              url: 'https://issues.example.test/project/42',
              duplicatedTabCount: 2,
              iconUrl: previewIcon('I', '#475569'),
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
