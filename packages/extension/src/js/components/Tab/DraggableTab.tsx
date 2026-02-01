import React, { useEffect } from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { useDrag, ItemTypes, getEmptyImage } from 'libs/react-dnd'
import DroppableTab from './DroppableTab'
import Tab from './Tab'
import { useStore } from 'components/hooks/useStore'
import { TabProps } from '../types'

const IS_SAFARI = process.env.IS_SAFARI === 'true'

export default observer((props: TabProps) => {
  if (IS_SAFARI) {
    return <Tab {...props} />
  }
  const { tab } = props
  const { dragStore } = useStore()
  const [dragProps, drag, connectDragPreview] = useDrag({
    type: ItemTypes.TAB,
    canDrag: true,
    item: () => dragStore.dragStart(tab),
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
