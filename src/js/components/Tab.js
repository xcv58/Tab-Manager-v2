import React from 'react'
import { inject, observer } from 'mobx-react'
import Checkbox from 'material-ui/Checkbox'

@inject('tabsStore')
@observer
export default class Tab extends React.Component {
  onClick = () => {
    const { tabsStore: { select, focus, selecting } } = this.props
    if (selecting) {
      select(this.props)
    } else {
      focus(this.props)
    }
  }

  select = () => {
    console.log('select')
    this.props.tabsStore.select(this.props)
  }

  onDragStart = () => {
    this.props.tabsStore.dragStart(this.props)
  }

  onDragEnd = () => {
    this.props.tabsStore.clear()
  }

  onDragOver = (e) => {
    e.nativeEvent.preventDefault()
    const { id, tabsStore: { setDropTarget } } = this.props
    const before = e.nativeEvent.offsetY < this.refs.tab.clientHeight / 2
    setDropTarget(id, before)
  }

  onDrop = () => {
    const { tabsStore: { drop } } = this.props
    drop(this.props)
  }

  render () {
    const { title, id, tabsStore: { selection, targetId, before } } = this.props
    const selected = selection.has(id)
    const style = {
      display: 'flex',
      alignItems: 'center',
      padding: 4,
      margin: 4,
      border: '1px red solid',
      borderTop: '1px red solid',
      borderBottom: '1px red solid',
      whiteSpace: 'nowrap'
    }
    if (targetId === id) {
      const border = 'border' + (before ? 'Top' : 'Bottom')
      style[border] = '2px black solid'
    }
    const { onDragStart, onDragEnd, onDragOver, onDrop } = this
    return (
      <div ref='tab'
        draggable
        style={style}
        {...{ onDragStart, onDragEnd, onDragOver, onDrop }}
      >
        <Checkbox
          style={{
            width: '1rem',
            height: '1rem'
          }}
          checked={selected}
          onChange={this.select}
        />
        <div onClick={this.onClick}>
          {title}
        </div>
      </div>
    )
  }
}
