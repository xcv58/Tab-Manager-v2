import React, { useEffect } from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { useDrag } from 'react-dnd'
import DroppableTab from './DroppableTab'
import { ItemTypes } from 'libs/react-dnd'
import { useStore } from 'components/hooks/useStore'
import { getEmptyImage } from 'react-dnd-html5-backend'
import { TabProps } from '../types'

export default observer((props: TabProps) => {
  const { tab } = props
  const { dragStore } = useStore()
  const [dragProps, drag, connectDragPreview] = useDrag({
    item: { type: ItemTypes.TAB },
    canDrag: true,
    begin: () => {
      dragStore.dragStart(tab)
    },
    end: () => {
      dragStore.dragEnd()
    },
    isDragging: () => tab.isSelected,
    collect: (monitor) => {
      return {
        isDragging: monitor.isDragging(),
      }
    },
  })
  const { isDragging } = dragProps
  useEffect(() => {
    connectDragPreview(getEmptyImage())
  })
  return (
    <div ref={drag} className={classNames({ 'opacity-25': isDragging })}>
      <DroppableTab {...props} />
    </div>
  )
})
