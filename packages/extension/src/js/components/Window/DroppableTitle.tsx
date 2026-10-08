import React from 'react'
import { observer } from 'mobx-react-lite'
import Title from './Title'
import { WinProps } from 'components/types'
import WindowDropZone from './WindowDropZone'
import HeaderDropTarget from './HeaderDropTarget'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'

export default observer((props: WinProps) => {
  const { win } = props
  const { dragStore } = useStore()
  const theme = useAppTheme()
  return (
    <div className="relative">
      <WindowDropZone win={win} position="top" />
      <Title {...props} className="" />
      {dragStore.dragging && (
        <div
          className="absolute inset-0 z-30 flex"
          data-testid={`window-header-drop-targets-${win.id}`}
          style={{ backgroundColor: theme.palette.background.paper }}
        >
          <HeaderDropTarget win={win} position="beginning" />
          <HeaderDropTarget win={win} position="end" />
        </div>
      )}
    </div>
  )
})
