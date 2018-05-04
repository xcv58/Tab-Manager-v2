import React from 'react'
import { inject, observer } from 'mobx-react'
import { DropTarget } from 'react-dnd'
import Paper from 'material-ui/Paper'
import Title from './Title'
import Tabs from './Tabs'
import Preview from 'components/Preview'
import { ItemTypes } from 'libs'
import { withTheme } from 'material-ui/styles'

@withTheme()
@inject('windowStore')
@inject('dragStore')
@DropTarget(
  ItemTypes.TAB,
  {
    canDrop (props, monitor) {
      return props.win.canDrop
    },
    drop (props, monitor) {
      if (monitor.didDrop()) {
        return
      }
      const {
        win: { tabs },
        dragStore: { drop }
      } = props
      const tab = tabs[tabs.length - 1]
      drop(tab, false)
    }
  },
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    canDrop: monitor.canDrop(),
    isDragging: !!monitor.getItem(),
    isOver: monitor.isOver({ shallow: true })
  })
)
@observer
export default class Window extends React.Component {
  render () {
    const {
      connectDropTarget,
      isOver,
      isDragging,
      canDrop,
      theme,
      win: { lastFocused, showTabs },
      left,
      right,
      width
    } = this.props

    const style = {
      width,
      minWidth: '20rem',
      padding: '0 1px',
      boxSizing: 'border-box',
      marginLeft: left && 'auto',
      marginRight: right && 'auto'
    }
    if (isDragging && isOver && !canDrop) {
      style.backgroundColor = theme.palette.error.light
    }
    const dropIndicator = canDrop && isOver && <Preview />
    const elevation = lastFocused ? 4 : 0
    return connectDropTarget(
      <div style={style}>
        <Paper elevation={elevation}>
          <Title {...this.props} />
          {showTabs && <Tabs {...this.props} />}
          {dropIndicator}
        </Paper>
      </div>
    )
  }
}
