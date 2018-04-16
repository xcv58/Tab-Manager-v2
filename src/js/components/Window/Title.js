import React from 'react'
import { inject, observer } from 'mobx-react'
import { DropTarget } from 'react-dnd'
import SelectAll from './SelectAll'
import Sort from './Sort'
import { dropTargetColor, highlightColor } from 'libs/colors'
import { ItemTypes } from 'libs'

@inject('dragStore')
@DropTarget(
  ItemTypes.TAB,
  {
    drop (props) {
      props.dragStore.dropToNewWindow()
    }
  },
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver()
  })
)
@observer
export default class Title extends React.Component {
  render () {
    const {
      connectDropTarget,
      isOver,
      win: { tabs, lastFocused }
    } = this.props
    const { length } = tabs
    const style = {
      display: 'flex',
      paddingLeft: '0.5rem',
      paddingRight: 4,
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '1.5rem',
      fontWeight: 'bold',
      lineHeight: '2.5rem'
    }
    const text = isOver ? 'New Window' : `${length} tab${length > 1 ? 's' : ''}`
    const title = (
      <span
        style={{
          flex: '1 1 auto',
          width: 'max-content'
        }}
      >
        {text}
      </span>
    )
    if (lastFocused) {
      style.backgroundColor = highlightColor
    }
    if (isOver) {
      style.backgroundColor = dropTargetColor
    }
    return connectDropTarget(
      <div style={style}>
        {title}
        <SelectAll {...this.props} />
        <Sort {...this.props} />
      </div>
    )
  }
}
