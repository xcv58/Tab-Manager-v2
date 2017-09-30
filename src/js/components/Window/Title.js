import React from 'react'
import { inject, observer } from 'mobx-react'
import { grey } from 'material-ui/colors'
import { dropTargetColor } from 'libs'

const borderBottom = `1px solid ${grey[200]}`

@inject('dragStore')
@observer
export default class Title extends React.Component {
  onDragOver = (e) => {
    e.nativeEvent.preventDefault()
    const { win: { id }, dragStore: { setTargetWinId } } = this.props
    setTargetWinId(id)
  }

  onDrop = () => {
    this.props.dragStore.dropToNewWindow()
  }

  render () {
    const { win: { id, tabs }, dragStore: { targetWinId } } = this.props
    const { length } = tabs
    const { onDragOver, onDrop } = this
    const style = {
      borderBottom,
      display: 'flex',
      paddingLeft: '2.5rem',
      fontSize: '1.5rem',
      fontWeight: 'bold',
      lineHeight: '3rem'
    }
    const isOver = id === targetWinId
    const dropIndicator = isOver && (
      <span style={{
        flex: '1 1 auto',
        padding: '0 2rem'
      }}>
        drop here to create a new window
      </span>
    )
    if (isOver) {
      style.backgroundColor = dropTargetColor
    }
    return (
      <div style={style} {...{ onDragOver, onDrop }}>
        <span>
          {length} tab{length > 1 && 's'}
        </span>
        {dropIndicator}
      </div>
    )
  }
}
