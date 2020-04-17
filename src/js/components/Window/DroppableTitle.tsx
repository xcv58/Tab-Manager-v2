import React from 'react'
import { observer } from 'mobx-react'
import { useDrop } from 'react-dnd'
import DropIndicator from 'components/DropIndicator'
import Divider from '@material-ui/core/Divider'
import { ItemTypes, getTargetTab } from 'libs/react-dnd'
import classNames from 'classnames'
import Title from './Title'
import { useStore } from 'components/StoreContext'

export default observer((props) => {
  const { win } = props
  const { dragStore } = useStore()
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    canDrop: () => win.canDrop,
    drop: (_, monitor) => {
      if (monitor.didDrop()) {
        return
      }
      const tab = getTargetTab(win.tabs, true)
      if (tab) {
        dragStore.drop(tab, true)
      }
    },
    collect: (monitor) => {
      return {
        canDrop: monitor.canDrop(),
        isDragging: !!monitor.getItem(),
        isOver: monitor.isOver({ shallow: true })
      }
    }
  })
  const { isOver, canDrop, isDragging } = dropProps
  const preview = canDrop && isOver && <DropIndicator />
  return (
    <div ref={drop}>
      <Title
        {...props}
        className={classNames({
          'bg-red-500': isDragging && isOver && !canDrop
        })}
      />
      <Divider />
      {preview}
    </div>
  )
})
