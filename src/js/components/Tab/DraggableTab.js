import React from 'react'
import { inject, observer } from 'mobx-react'
import Tab from './Tab'

@inject('searchStore')
@inject('dragStore')
@observer
export default class DraggableTab extends React.Component {
  onDragStart = () => {
    this.props.dragStore.dragStart(this.props)
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

  componentDidUpdate (prevProps, prevState) {
    const {
      id,
      searchStore: { focusedTab, searchTriggered, scrolled }
    } = this.props
    if (id === focusedTab) {
      const containmentRect = this.props.containment().getBoundingClientRect()
      const { top, bottom } = this.node.getBoundingClientRect()
      const topGap = top - containmentRect.top
      const bottomGap = containmentRect.bottom - bottom
      if (topGap > 0 && bottomGap > 0) {
        return
      }
      const scrollOption = {
        block: 'end',
        inline: 'start',
        behavior: 'smooth'
      }
      if (searchTriggered) {
        scrollOption.behavior = 'auto'
        scrolled()
      }
      this.node.scrollIntoView(scrollOption)
    }
  }

  render () {
    const { id, dragStore: { targetId, before } } = this.props
    const style = {}
    if (targetId === id) {
      const border = 'border' + (before ? 'Top' : 'Bottom')
      const margin = 'margin' + (before ? 'Top' : 'Bottom')
      style[border] = '1px black solid'
      style[margin] = '-1px'
    }
    const { onDragStart, onDragEnd, onDragOver, onDrop } = this
    return (
      <div
        draggable
        style={style}
        ref={(el) => { this.node = el || this.node }}
        {...{ onDragStart, onDragEnd, onDragOver, onDrop }}
      >
        <Tab {...this.props} />
      </div>
    )
  }
}
