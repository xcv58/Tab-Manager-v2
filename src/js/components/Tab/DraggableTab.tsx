import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
import { useDrag, useDrop } from 'react-dnd'
import Tab from './Tab'
import { ItemTypes } from 'libs/react-dnd'
import Preview from 'components/Preview'
import { withTheme } from '@material-ui/core/styles'
import { useStore } from 'components/StoreContext'
import { getEmptyImage } from 'react-dnd-html5-backend'

const DraggableTab = observer(props => {
  const { tab, theme } = props
  const { showTab } = tab
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
    collect: monitor => {
      return {
        isDragging: monitor.isDragging()
      }
    }
  })
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    drop: () => {
      dragStore.drop(tab)
    },
    canDrop: () => tab.win.canDrop,
    collect: monitor => {
      return {
        canDrop: monitor.canDrop(),
        isOver: monitor.isOver({ shallow: true })
      }
    }
  })
  const { isDragging } = dragProps
  const { isOver, canDrop } = dropProps
  const style = {}
  if (isDragging) {
    style.display = 'none'
  }
  const tabStyle = {}
  if (isOver && !canDrop) {
    tabStyle.backgroundColor = theme.palette.error.light
  }
  const preview = canDrop && isOver && <Preview />
  useEffect(() => {
    connectDragPreview(getEmptyImage())
  })
  return (
    <div
      ref={node => {
        drag(node)
        drop(node)
      }}
      style={{ ...style, ...props.style }}
    >
      {preview}
      {showTab && <Tab {...props} style={tabStyle} />}
    </div>
  )
})

export default withTheme(DraggableTab)
