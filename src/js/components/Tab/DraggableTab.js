import React from 'react'
import { inject, observer } from 'mobx-react'
import { DragSource, DropTarget } from 'react-dnd'
import Tab from './Tab'
import { borderColor } from 'libs/colors'
import { ItemTypes, getBackground } from 'libs'

const tabSource = {
  beginDrag (props, monitor, component) {
    const { tab, dragStore: { dragStart } } = props
    dragStart(tab)
    return { id: props.tab.id }
  },
  endDrag (props, monitor, component) {
    props.dragStore.dragEnd()
  }
}

const tabTarget = {
  drop (props) {
    const { tab, dragStore: { drop } } = props
    drop(tab)
  }
}

@inject('dragStore')
@observer
@DropTarget(
  ItemTypes.TAB,
  tabTarget,
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver({ shallow: true })
  })
)
@DragSource(
  ItemTypes.TAB,
  tabSource,
  (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview()
  })
)
export default class DraggableTab extends React.Component {
  componentDidMount () {
    const { connectDragPreview } = this.props
    connectDragPreview(document.getElementById('dragPreview'))
  }

  render () {
    const { connectDragSource, connectDropTarget, isOver } = this.props
    const style = {
      borderBottom: `1px solid ${borderColor}`
    }
    if (isOver) {
      style.background = getBackground(true)
    }
    return connectDropTarget(connectDragSource(
      <div
        style={{
          ...style,
          ...this.props.style
        }}
      >
        <Tab {...this.props} />
      </div>
    ))
  }
}
