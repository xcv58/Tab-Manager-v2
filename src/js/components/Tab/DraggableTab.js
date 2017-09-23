import React from 'react'
import { inject, observer } from 'mobx-react'
import { grey } from 'material-ui/colors'
import Tab from './Tab'

@inject('searchStore')
@inject('tabStore')
@inject('dragStore')
@observer
export default class DraggableTab extends React.Component {
  onDragStart = (e) => {
    this.props.dragStore.dragStart(this.props)
    e.dataTransfer.setDragImage(this.props.dragPreview(), 0, 0)
  }

  onDragEnd = () => {
    this.props.dragStore.dragEnd()
  }

  onDragOver = (e) => {
    e.nativeEvent.preventDefault()
    const { id, dragStore: { setDropTarget } } = this.props
    const before = e.nativeEvent.offsetY < this.node.clientHeight / 2
    setDropTarget(id, before)
  }

  onDrop = () => {
    const { dragStore: { drop } } = this.props
    drop(this.props)
  }

  render () {
    const { id, dragStore: { before, targetId } } = this.props
    const style = {
      borderBottom: `1px solid ${grey[200]}`,
      borderTop: '1px solid transparent',
      margin: '-1px 0'
    }
    if (targetId === id) {
      const border = 'border' + (before ? 'Top' : 'Bottom')
      style[border] = '1px black solid'
    }
    const { onDragStart, onDragEnd, onDragOver, onDrop } = this
    return (
      <div
        draggable
        style={{
          ...style,
          ...this.props.style
        }}
        ref={(el) => { this.node = el || this.node }}
        {...{ onDragStart, onDragEnd, onDragOver, onDrop }}
      >
        <Tab {...this.props} />
      </div>
    )
  }
}
