import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { useDrop } from 'react-dnd'
import Tab from './Tab'
import { ItemTypes } from 'libs/react-dnd'
import DropIndicator from 'components/DropIndicator'
import { useStore } from 'components/hooks/useStore'
import { TabProps } from 'components/types'

export default observer((props: TabProps) => {
  const { tab } = props
  const { dragStore } = useStore()
  const dropRef = React.useRef<HTMLDivElement | null>(null)
  const [dropPosition, setDropPosition] = React.useState<'before' | 'after'>(
    'before',
  )
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    drop: () => {
      dragStore.drop(tab, dropPosition === 'before')
    },
    hover: (_, monitor) => {
      const node = dropRef.current
      const clientOffset = monitor.getClientOffset()
      if (!node || !clientOffset) {
        return
      }
      const rect = node.getBoundingClientRect()
      const midpointY = rect.top + rect.height / 2
      const nextPosition = clientOffset.y <= midpointY ? 'before' : 'after'
      setDropPosition((previousPosition) => {
        return previousPosition === nextPosition
          ? previousPosition
          : nextPosition
      })
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
  drop(dropRef)
  const previewBefore =
    canDrop && isOver && dropPosition === 'before' ? (
      <DropIndicator position="before" />
    ) : null
  const previewAfter =
    canDrop && isOver && dropPosition === 'after' ? (
      <DropIndicator position="after" />
    ) : null
  return (
    <div ref={dropRef}>
      {previewBefore}
      <Tab
        {...props}
        className={classNames({
          'bg-red-500 hover:bg-red-500': isOver && !canDrop,
        })}
      />
      {previewAfter}
    </div>
  )
})
