import React, { CSSProperties } from 'react'
import { observer } from 'mobx-react-lite'
import Title from './Title'
import { WinProps } from 'components/types'
import WindowDropZone from './WindowDropZone'
import HeaderDropTarget from './HeaderDropTarget'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import { getUiColorTokens } from 'libs/uiColorTokens'
import { getNoun } from 'libs'

const countFormatter = new Intl.NumberFormat('en-US')
const compactCountFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export default observer((props: WinProps) => {
  const { win } = props
  const { dragStore, userStore } = useStore()
  const theme = useAppTheme()
  const { headerSurface, toolbarShellBorderColor, primaryText } =
    getUiColorTokens(
      theme.mode === 'dark',
      userStore.uiPreset,
      userStore.increaseContrast,
    )
  // Only subscribe to the count while the overlay is mounted; the normal
  // title already observes it independently.
  const count = dragStore.dragging ? win.tabs.length : 0
  const noun = getNoun('tab', count)
  const fullCount = `${countFormatter.format(count)} ${noun}`
  const compactCount = `${compactCountFormatter.format(count).toLowerCase()} ${noun}`
  const overlayStyle = {
    '--window-header-full-count-width': `calc(${Math.max(8, fullCount.length)}ch + 1rem)`,
    '--window-header-compact-count-width': `calc(${Math.max(8, compactCount.length)}ch + 1rem)`,
  } as CSSProperties
  return (
    <div
      className="window-drop-header relative"
      style={{ backgroundColor: headerSurface }}
    >
      <WindowDropZone win={win} position="top" />
      <Title
        {...props}
        dropOverlay={dragStore.dragging}
        className={
          dragStore.dragging ? 'pointer-events-none relative z-20' : ''
        }
      />
      {dragStore.dragging && (
        <div
          className="window-header-drop-targets absolute inset-0 z-30 flex text-sm"
          style={overlayStyle}
          data-testid={`window-header-drop-targets-${win.id}`}
        >
          <HeaderDropTarget win={win} position="beginning" />
          <HeaderDropTarget win={win} position="end" />
          <span
            data-testid={`window-header-drop-count-${win.id}`}
            className="window-header-drop-count pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border px-2 py-1 font-semibold whitespace-nowrap"
            style={{
              backgroundColor: headerSurface,
              borderColor: toolbarShellBorderColor,
              color: primaryText,
            }}
          >
            <span className="sr-only">{fullCount}</span>
            <span aria-hidden="true" className="window-header-full-count">
              {fullCount}
            </span>
            <span aria-hidden="true" className="window-header-compact-count">
              {compactCount}
            </span>
          </span>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 z-10"
            style={{
              top: 4,
              bottom: 4,
              width: 1,
              backgroundColor: toolbarShellBorderColor,
            }}
          />
        </div>
      )}
    </div>
  )
})
