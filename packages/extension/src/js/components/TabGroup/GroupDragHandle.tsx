import React, { useEffect } from 'react'
import classNames from 'classnames'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import { useDrag } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import { ItemTypes } from 'libs/react-dnd'
import { useStore } from 'components/hooks/useStore'
import ControlIconButton from 'components/ControlIconButton'

type Props = {
  groupId: number
  className?: string
}

export default ({ groupId, className }: Props) => {
  const { dragStore } = useStore()
  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }
  const [dragProps, drag, connectDragPreview] = useDrag({
    type: ItemTypes.TAB,
    canDrag: true,
    item: () => dragStore.dragStartGroup(groupId),
    end: () => {
      dragStore.dragEnd()
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })
  const { isDragging } = dragProps

  useEffect(() => {
    connectDragPreview(getEmptyImage())
  }, [connectDragPreview])

  return (
    <ControlIconButton
      ref={drag}
      className={classNames(className, {
        'opacity-50': isDragging,
      })}
      controlSize="compact"
      sx={{
        cursor: 'move',
        '&:hover': {
          cursor: 'move',
        },
      }}
      data-testid={`tab-group-drag-handle-${groupId}`}
      title="Drag group"
      aria-label="Drag group"
      onPointerDown={onPointerDown}
    >
      <DragHandleIcon sx={{ fontSize: 15 }} />
    </ControlIconButton>
  )
}
