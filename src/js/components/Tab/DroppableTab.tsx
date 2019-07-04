import React from 'react'
import { observer } from 'mobx-react'
import { useDrop } from 'react-dnd'
import Tab from './Tab'
import { ItemTypes } from 'libs/react-dnd'
import Preview from 'components/Preview'
import { withTheme } from '@material-ui/core/styles'
import { useStore } from 'components/StoreContext'

const DroppableTab = observer(props => {
  const { tab, theme } = props
  const { showTab } = tab
  const { dragStore } = useStore()
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
  const { isOver, canDrop } = dropProps
  const tabStyle = {}
  if (isOver && !canDrop) {
    tabStyle.backgroundColor = theme.palette.error.light
  }
  const preview = canDrop && isOver && <Preview />
  return (
    <div ref={drop}>
      {preview}
      {showTab && <Tab {...props} style={tabStyle} />}
    </div>
  )
})

export default withTheme(DroppableTab)
