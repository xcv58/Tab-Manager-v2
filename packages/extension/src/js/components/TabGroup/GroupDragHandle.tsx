import React, { useEffect } from 'react'
import classNames from 'classnames'
import { useDrag } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import { ItemTypes } from 'libs/react-dnd'
import { useStore } from 'components/hooks/useStore'
import { useTheme } from 'components/hooks/useTheme'

type Props = {
  groupId: number
  className?: string
}

export default ({ groupId, className }: Props) => {
  const { dragStore } = useStore()
  const isDarkTheme = useTheme()
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
    <button
      ref={drag}
      className={classNames(
        'inline-flex items-center justify-center w-7 h-7 rounded-full cursor-move focus:outline-none focus:ring text-base',
        className,
        {
          'opacity-50': isDragging,
          'hover:bg-blue-200 active:bg-blue-300': !isDarkTheme,
          'hover:bg-gray-600 active:bg-gray-800': isDarkTheme,
        },
      )}
      data-testid={`tab-group-drag-handle-${groupId}`}
      title="Drag group"
    >
      &#9776;
    </button>
  )
}
