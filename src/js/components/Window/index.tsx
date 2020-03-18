import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react'
import { useDrop } from 'react-dnd'
import DroppableTitle from './DroppableTitle'
import Tabs from './Tabs'
import Preview from 'components/Preview'
import { ItemTypes, getTargetTab } from 'libs/react-dnd'
import { useStore } from 'components/StoreContext'
import { CSSProperties } from '@material-ui/styles'
import Loading from 'components/Loading'

const Window = observer(props => {
  const { dragStore, userStore } = useStore()
  const { win } = props
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
    collect: monitor => {
      return {
        canDrop: monitor.canDrop(),
        isDragging: !!monitor.getItem(),
        isOver: monitor.isOver({ shallow: true })
      }
    }
  })
  const { canDrop, isOver, isDragging } = dropProps
  const style: CSSProperties = {
    minWidth: `${userStore.tabWidth}rem`,
    height: 'fit-content',
    boxSizing: 'border-box'
  }
  const dropIndicator = canDrop && isOver && <Preview />
  if (!win.visibleLength) {
    return null
  }
  return (
    <div
      ref={drop}
      style={style}
      className={classNames('w-full p-1 pb-8', {
        'bg-red-500': isDragging && isOver && !canDrop
      })}
    >
      <div
        className={classNames({
          'shadow-2xl': lastFocused,
          'shadow-sm': !lastFocused
        })}
      >
        <DroppableTitle {...props} />
        {showTabs ? (
          <Tabs {...props} />
        ) : (
          <div style={{ height: 42 * (visibleLength - 2) }}>
            <Loading small />
          </div>
        )}
        {dropIndicator}
      </div>
    </div>
  )
})

// This export is for testing
export { Window }

export default Window
