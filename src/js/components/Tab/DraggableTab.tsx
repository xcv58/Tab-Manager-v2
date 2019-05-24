import React from 'react'
import { inject, observer } from 'mobx-react'
import { DragSource, DropTarget } from 'react-dnd'
import Tab from './Tab'
import { ItemTypes, tabDropCollect, tabSource, tabTarget } from 'libs/react-dnd'
import Preview from 'components/Preview'
import { withTheme } from '@material-ui/core/styles'

@inject('dragStore')
@DropTarget(ItemTypes.TAB, tabTarget, tabDropCollect)
@DragSource(ItemTypes.TAB, tabSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging()
}))
@observer
class DraggableTab extends React.Component {
  componentDidMount () {
    const { connectDragPreview } = this.props
    connectDragPreview(document.getElementById('dragPreview'))
  }

  render () {
    const {
      tab: { showTab },
      connectDragSource,
      connectDropTarget,
      isDragging,
      canDrop,
      isDraggingTarget,
      theme,
      isOver
    } = this.props
    const style = {}
    if (isDragging) {
      style.display = 'none'
    }
    const tabStyle = {}
    if (isDraggingTarget && isOver && !canDrop) {
      tabStyle.backgroundColor = theme.palette.error.light
    }
    const preview = canDrop && isOver && <Preview />
    return connectDropTarget(
      connectDragSource(
        <div
          style={{
            ...style,
            ...this.props.style
          }}
        >
          {preview}
          {showTab && <Tab {...this.props} style={tabStyle} />}
        </div>
      )
    )
  }
}

export default withTheme(DraggableTab)
