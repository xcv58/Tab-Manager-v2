import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { useDrop, ItemTypes } from 'libs/react-dnd'
import Tab from './Tab'
import DropIndicator from 'components/DropIndicator'
import { useStore } from 'components/hooks/useStore'
import { TabProps } from 'components/types'

export default observer((props: TabProps) => {
  const { tab } = props
  const { dragStore } = useStore()
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    drop: () => {
      dragStore.drop(tab)
    },
    canDrop: () => tab.win.canDrop,
    collect: (monitor) => {
      return {
        canDrop: monitor.canDrop(),
        isOver: monitor.isOver({ shallow: true }),
      }
    },
  })
  const { isOver, canDrop } = dropProps
  const preview = canDrop && isOver && <DropIndicator />
  return (
    <div ref={drop}>
      {preview}
      <Tab
        {...props}
        className={classNames({
          'bg-red-500 hover:bg-red-500': isOver && !canDrop,
        })}
      />
    </div>
  )
})
