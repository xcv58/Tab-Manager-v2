import React from 'react'
import { inject, observer } from 'mobx-react'
import { DragSource, DropTarget } from 'react-dnd'
import Tab from './Tab'
import { ItemTypes, collect } from 'libs/react-dnd'
import Preview from 'components/Preview'
import { withTheme } from 'material-ui/styles'

const tabSource = {
  beginDrag (props, monitor, component) {
    const {
      tab,
      dragStore: { dragStart }
    } = props
    dragStart(tab)
    return {}
  },
  endDrag (props, monitor, component) {
    props.dragStore.dragEnd()
  },
  isDragging (props, monitor) {
    return props.tab.isSelected
  }
}

const tabTarget = {
  canDrop (props) {
    return props.tab.win.canDrop
  },
  drop (props) {
    const {
      tab,
      dragStore: { drop }
    } = props
    drop(tab)
  }
}

@withTheme()
@inject('dragStore')
@DropTarget(ItemTypes.TAB, tabTarget, collect)
@DragSource(ItemTypes.TAB, tabSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging()
}))
@observer
export default class DraggableTab extends React.Component {
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
