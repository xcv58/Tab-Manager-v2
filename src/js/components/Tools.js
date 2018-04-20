import React from 'react'
import { inject, observer } from 'mobx-react'
import { DropTarget } from 'react-dnd'
import Preview from 'components/Preview'
import Search from 'components/Search'
import Summary from 'components/Summary'
import OpenInTab from 'components/OpenInTab'
import { ItemTypes } from 'libs'
import { dropTargetColor, droppedColor } from 'libs/colors'

const style = {
  display: 'flex',
  height: '3rem',
  alignItems: 'center',
  flex: '0 0 auto',
  padding: '0 4px'
}

@inject('dragStore')
@DropTarget(
  ItemTypes.TAB,
  {
    drop (props) {
      props.dragStore.dropToNewWindow()
    },
    canDrop () {
      return true
    }
  },
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    canDrop: monitor.canDrop(),
    isOver: monitor.isOver()
  })
)
@observer
export default class Tools extends React.Component {
  render () {
    const { connectDropTarget, isOver, canDrop } = this.props
    if (canDrop) {
      const backgroundColor = isOver ? droppedColor : dropTargetColor
      return connectDropTarget(
        <div
          style={{
            ...style,
            backgroundColor,
            fontSize: '200%',
            justifyContent: 'center',
            zIndex: 9
          }}
        >
          Drop here to open in new window
          <div
            style={{
              position: 'absolute',
              top: '3rem',
              backgroundColor: 'white'
            }}
          >
            {isOver && <Preview />}
          </div>
        </div>
      )
    }
    return (
      <div style={style}>
        <Summary />
        <Search inputRef={this.props.inputRef} />
        <OpenInTab />
      </div>
    )
  }
}
