import React from 'react'
import { inject, observer } from 'mobx-react'
import Checkbox from 'material-ui/Checkbox'

const borderBottom = '1px solid rgba(0,0,0,.08)'
const borderTop = '1px solid white'

@inject('searchStore')
@inject('tabStore')
@inject('dragStore')
@observer
export default class Tab extends React.Component {
  onClick = () => {
    this.focus()
    this.props.tabStore.activate(this.props)
  }

  select = () => {
    this.focus()
    this.props.tabStore.select(this.props)
  }

  focus = () => {
    this.props.searchStore.focus(this.props)
  }

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
        block: 'start',
        inline: 'start',
        behavior: 'smooth'
      }
      if (topGap <= 0) {
        scrollOption.block = 'end'
      }
      if (searchTriggered) {
        scrollOption.behavior = 'auto'
        scrolled()
      }
      this.node.scrollIntoView(scrollOption)
    }
  }

  render () {
    const {
      title,
      id,
      tabStore: { selection },
      dragStore: { targetId, before },
      searchStore: { query, matchedSet, focusedTab }
    } = this.props
    const notMatched = Boolean(query) && !matchedSet.has(id)
    const focused = focusedTab === id
    const selected = selection.has(id)
    const style = {
      display: 'flex',
      alignItems: 'center',
      padding: 8,
      margin: 0,
      borderTop: borderTop,
      borderBottom: borderBottom,
      whiteSpace: 'nowrap'
    }
    if (notMatched) {
      style.opacity = 0.2
    }
    if (focused) {
      style.borderLeft = '1px red solid'
    }
    if (targetId === id) {
      const border = 'border' + (before ? 'Top' : 'Bottom')
      style[border] = '1px black solid'
    }
    const { onDragStart, onDragEnd, onDragOver, onDrop } = this
    return (
      <div
        draggable
        style={style}
        ref={(el) => { this.node = el || this.node }}
        {...{ onDragStart, onDragEnd, onDragOver, onDrop }}
      >
        <Checkbox
          checked={selected}
          onChange={this.select}
          style={{
            width: '1rem',
            height: '1rem',
            padding: 4
          }}
        />
        <div
          onClick={this.onClick}
          style={{
            marginLeft: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
          {title}
        </div>
      </div>
    )
  }
}
