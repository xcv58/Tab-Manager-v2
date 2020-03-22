import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
import { useDrag } from 'react-dnd'
import DroppableTab from './DroppableTab'
import { ItemTypes } from 'libs/react-dnd'
import { useStore } from 'components/StoreContext'
import { getEmptyImage } from 'react-dnd-html5-backend'

export default observer((props) => {
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
        isDragging: monitor.isDragging()
      }
    }
  })
  const { isDragging } = dragProps
  const style = {}
  if (isDragging) {
    style.display = 'none'
  }
  useEffect(() => {
    connectDragPreview(getEmptyImage())
  })
  return (
    <div ref={drag} style={{ ...style, ...props.style }}>
      <DroppableTab {...props} />
    </div>
  )
})
