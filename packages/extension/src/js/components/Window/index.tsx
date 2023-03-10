import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { useDrop } from 'react-dnd'
import DroppableTitle from './DroppableTitle'
import Tabs from './Tabs'
import DropIndicator from 'components/DropIndicator'
import { ItemTypes, getTargetTab } from 'libs/react-dnd'
import { useStore, useTabHeight } from 'components/hooks/useStore'
import { CSSProperties } from '@mui/styles'
import Loading from 'components/Loading'
import { WinProps } from 'components/types'

export default observer((props: WinProps & { width: string }) => {
  const { dragStore, userStore } = useStore()
  const tabHeight = useTabHeight()
  const { win, width } = props
  const { lastFocused, showTabs, visibleLength } = win
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    canDrop: () => win.canDrop,
    drop: (_, monitor) => {
      if (monitor.didDrop()) {
        return
      }
      const tab = getTargetTab(win.tabs, false)
      if (tab) {
        dragStore.drop(tab, false)
      }
    },
    collect: (monitor) => {
      return {
        canDrop: monitor.canDrop(),
        isDragging: !!monitor.getItem(),
        isOver: monitor.isOver({ shallow: true }),
      }
    },
  })
  const { canDrop, isOver, isDragging } = dropProps
  const style: CSSProperties = {
    minWidth: `${userStore.tabWidth}rem`,
    width,
    height: 'fit-content',
    boxSizing: 'border-box',
    padding: `0px 1px ${tabHeight}px 1px`,
  }
  const dropIndicator = canDrop && isOver && <DropIndicator />
  if (!win.visibleLength) {
    return null
  }
  return (
    <div
      ref={drop}
      style={style}
      className={classNames({
        'bg-red-500': isDragging && isOver && !canDrop,
      })}
    >
      <div
        className={classNames({
          'shadow-2xl': lastFocused,
          'shadow-sm hover:shadow-lg': !lastFocused,
        })}
      >
        <DroppableTitle {...props} />
        {showTabs && <Tabs {...props} />}
        {!showTabs && (
          <div style={{ height: tabHeight * (visibleLength - 2) }}>
            <Loading small />
          </div>
        )}
        {dropIndicator}
      </div>
    </div>
  )
})
