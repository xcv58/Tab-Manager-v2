import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { useTheme } from '@mui/material/styles'
import { useDrop } from 'react-dnd'
import DropIndicator from 'components/DropIndicator'
import { ItemTypes } from 'libs/react-dnd'
import { useStore } from 'components/hooks/useStore'
import { WinProps } from 'components/types'

type Props = WinProps & {
  position: 'top' | 'bottom'
}

export default observer((props: Props) => {
  const theme = useTheme()
  const { position, win } = props
  const { dragStore } = useStore()
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    canDrop: () => win.canDrop,
    drop: (_, monitor) => {
      if (monitor.didDrop()) {
        return
      }
      dragStore.dropAt({
        windowId: win.id,
        index: position === 'top' ? 0 : win.tabs.length,
        forceUngroup: true,
        source: 'window-zone',
      })
    },
    collect: (monitor) => {
      return {
        canDrop: monitor.canDrop(),
        isOver: monitor.isOver({ shallow: true }),
      }
    },
  })
  const { canDrop, isOver } = dropProps
  const preview =
    canDrop && isOver ? (
      <DropIndicator position={position === 'top' ? 'before' : 'after'} />
    ) : null
  return (
    <div
      ref={drop}
      className={classNames(
        {
          'absolute inset-x-0 top-0 z-20 h-2': position === 'top',
          'absolute inset-x-0 bottom-0 z-20 h-2': position === 'bottom',
        },
        {
          'bg-blue-100': isOver && !canDrop,
        },
      )}
      style={{
        backgroundColor:
          isOver && !canDrop ? theme.palette.action.hover : undefined,
      }}
      data-testid={`window-drop-zone-${position}-${win.id}`}
    >
      {preview}
    </div>
  )
})
