import React from 'react'
import { observer } from 'mobx-react'
import { useDrop } from 'react-dnd'
import Paper from '@material-ui/core/Paper'
import Title from './Title'
import Tabs from './Tabs'
import Preview from 'components/Preview'
import { ItemTypes, getTargetTab } from 'libs/react-dnd'
import { useStore } from 'components/StoreContext'
import { useTheme } from '@material-ui/core'
import { CSSProperties } from '@material-ui/styles'

const Window = observer(props => {
  const theme = useTheme()
  const { dragStore } = useStore()
  const { win } = props
  const { lastFocused, showTabs } = win
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
    width: '100%',
    minWidth: '20rem',
    height: 'fit-content',
    padding: '2px 4px 32px 4px',
    boxSizing: 'border-box'
  }
  if (isDragging && isOver && !canDrop) {
    style.backgroundColor = theme.palette.error.light
  }
  const dropIndicator = canDrop && isOver && <Preview />
  const elevation = lastFocused ? 16 : 2
  if (!win.visibleLength) {
    return null
  }
  return (
    <div ref={drop} style={style}>
      <Paper elevation={elevation}>
        <Title {...props} />
        {showTabs && <Tabs {...props} />}
        {dropIndicator}
      </Paper>
    </div>
  )
})

// This export is for testing
export { Window }

export default Window
