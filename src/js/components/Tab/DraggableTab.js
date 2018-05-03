import React from 'react'
import { inject, observer } from 'mobx-react'
import { DragSource, DropTarget } from 'react-dnd'
import Tab from './Tab'
import { ItemTypes } from 'libs'
import Preview from 'components/Preview'

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
  drop (props) {
    const {
      tab,
      dragStore: { drop }
    } = props
    drop(tab)
  }
}

@inject('dragStore')
@DropTarget(ItemTypes.TAB, tabTarget, (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver({ shallow: true })
}))
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
      isOver
    } = this.props
    const style = {}
    if (isDragging) {
      style.display = 'none'
    }
    const preview = isOver && <Preview />
    return connectDropTarget(
      connectDragSource(
        <div
          style={{
            ...style,
            ...this.props.style
          }}
        >
          {preview}
          {showTab && <Tab {...this.props} />}
        </div>
      )
    )
  }
}
