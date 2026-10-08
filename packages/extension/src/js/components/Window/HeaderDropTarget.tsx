import React from 'react'
import { observer } from 'mobx-react-lite'
import { useDrop } from 'react-dnd'
import { ItemTypes } from 'libs/react-dnd'
import { useAppTheme } from 'libs/appTheme'
import { useStore } from 'components/hooks/useStore'
import { WinProps } from 'components/types'
import type { WindowEdge } from 'stores/DragStore'

type Props = WinProps & { position: WindowEdge }

export default observer(({ win, position }: Props) => {
  const theme = useAppTheme()
  const { dragStore } = useStore()
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    canDrop: () => win.canDrop,
    drop: (_, monitor) => {
      if (!monitor.didDrop()) {
        dragStore.moveSelectedTabsToWindowEdge(win.id, position)
      }
    },
    collect: (monitor) => ({
      canDrop: monitor.canDrop(),
      isOver: monitor.isOver({ shallow: true }),
    }),
  })
  const { canDrop, isOver } = dropProps
  const active = canDrop && isOver
  const label = position === 'beginning' ? 'Beginning' : 'End'

  return (
    <div
      ref={drop}
      data-testid={`window-header-drop-${position}-${win.id}`}
      aria-label={`Move to ${position}`}
      title={
        win.canDrop ? `Move to ${position}` : 'Cannot move tabs to this window'
      }
      className="flex min-w-0 flex-1 items-center justify-center gap-1 px-1 text-sm font-semibold"
      style={{
        color: active ? theme.palette.primary.main : theme.palette.text.primary,
        backgroundColor: active
          ? theme.palette.action.selected
          : theme.palette.background.paper,
        boxShadow: `inset 0 0 0 ${active ? 2 : 1}px ${
          active ? theme.palette.primary.main : theme.palette.divider
        }`,
        cursor: win.canDrop ? 'move' : 'not-allowed',
        opacity: win.canDrop ? 1 : 0.5,
      }}
    >
      <span aria-hidden="true">{position === 'beginning' ? '↑' : '↓'}</span>
      <span>{active ? `Move to ${position}` : label}</span>
    </div>
  )
})
