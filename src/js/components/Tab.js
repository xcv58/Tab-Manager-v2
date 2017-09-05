import React from 'react'
import { inject, observer } from 'mobx-react'
import Checkbox from 'material-ui/Checkbox'

const borderBottom = '1px solid rgba(0,0,0,.08)'
const borderTop = '1px solid white'

@inject('searchStore')
@inject('tabStore')
@observer
export default class Tab extends React.Component {
  onClick = () => {
    this.props.tabStore.activate(this.props)
  }

  select = () => {
    this.props.tabStore.select(this.props)
  }

  onDragStart = () => {
    this.props.tabStore.dragStart(this.props)
  }

  onDragEnd = () => {
    this.props.tabStore.dragEnd()
  }

  onDragOver = (e) => {
    e.nativeEvent.preventDefault()
    const { id, tabStore: { setDropTarget } } = this.props
    const before = e.nativeEvent.offsetY < this.refs.tab.clientHeight / 2
    setDropTarget(id, before)
  }

  onDrop = () => {
    const { tabStore: { drop } } = this.props
    drop(this.props)
  }

  componentDidUpdate (prevProps, prevState) {
    const {
      id,
      searchStore: { focusedTab, searchTriggered, scrolled }
    } = this.props
    if (id === focusedTab) {
      const scrollOption = {
        block: 'end',
        behavior: 'smooth'
      }
      if (searchTriggered) {
        scrollOption.behavior = 'auto'
        scrolled()
      }
      this.refs.tab.scrollIntoView(scrollOption)
    }
  }

  render () {
    const {
      title,
      id,
      tabStore: { selection, targetId, before },
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
      <div ref='tab'
        draggable
        style={style}
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
            marginLeft: 4
          }}>
          {title}
        </div>
      </div>
    )
  }
}
