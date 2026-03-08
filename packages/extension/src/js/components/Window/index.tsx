import React from 'react'
import { observer } from 'mobx-react-lite'
import { useTheme } from '@mui/material/styles'
import DroppableTitle from './DroppableTitle'
import Tabs from './Tabs'
import { useStore, useTabHeight } from 'components/hooks/useStore'
import { CSSProperties } from '@mui/styles'
import Loading from 'components/Loading'
import { WinProps } from 'components/types'
import WindowDropZone from './WindowDropZone'

export default observer((props: WinProps & { width: string }) => {
  const theme = useTheme()
  const { userStore } = useStore()
  const tabHeight = useTabHeight()
  const { win, width } = props
  const { showTabs, visibleLength } = win
  const style: CSSProperties = {
    minWidth: `${userStore.tabWidth}rem`,
    width,
    height: 'fit-content',
    boxSizing: 'border-box',
    padding: `0px 1px ${tabHeight}px 1px`,
  }
  if (!win.visibleLength) {
    return null
  }
  return (
    <div style={style} data-testid={`window-card-${win.id}`}>
      <div
        className="overflow-hidden rounded-lg border"
        style={{
          backgroundColor: theme.palette.background.paper,
          borderColor:
            theme.palette.mode === 'dark'
              ? 'rgba(238, 241, 245, 0.26)'
              : 'rgba(148, 163, 184, 0.58)',
        }}
      >
        <DroppableTitle {...props} />
        {showTabs && (
          <div className="px-1">
            <Tabs {...props} />
          </div>
        )}
        {!showTabs && (
          <div style={{ height: tabHeight * (visibleLength - 2) }}>
            <Loading small />
          </div>
        )}
        <WindowDropZone win={win} position="bottom" />
      </div>
    </div>
  )
})
