import React from 'react'
import { observer } from 'mobx-react-lite'
import Title from './Title'
import { WinProps } from 'components/types'
import WindowDropZone from './WindowDropZone'
import HeaderDropTarget from './HeaderDropTarget'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import { getUiColorTokens } from 'libs/uiColorTokens'

export default observer((props: WinProps) => {
  const { win } = props
  const { dragStore, userStore } = useStore()
  const theme = useAppTheme()
  const { headerSurface, toolbarShellBorderColor } = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  return (
    <div className="relative" style={{ backgroundColor: headerSurface }}>
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
          className="absolute inset-0 flex"
          data-testid={`window-header-drop-targets-${win.id}`}
        >
          <HeaderDropTarget win={win} position="beginning" />
          <HeaderDropTarget win={win} position="end" />
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
