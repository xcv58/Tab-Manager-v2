import React from 'react'
import { inject, observer } from 'mobx-react'
import { DropTarget } from 'react-dnd'
import Paper from 'material-ui/Paper'
import Preview from 'components/Preview'
import Search from 'components/Search'
import Summary from 'components/Summary'
import OpenInTab from 'components/OpenInTab'
import { ItemTypes, getNoun } from 'libs'
import { dropTargetColor, droppedColor } from 'libs/colors'

const style = {
  display: 'flex',
  height: '3rem',
  alignItems: 'center',
  flex: '0 0 auto',
  padding: '0 4px'
}

@inject('dragStore')
@inject('tabStore')
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
    const {
      connectDropTarget,
      isOver,
      canDrop,
      tabStore: { selection }
    } = this.props
    const size = selection.size
    if (canDrop) {
      const backgroundColor = isOver ? droppedColor : dropTargetColor
      const text = isOver
        ? `Open below ${getNoun('tab', size)}`
        : 'Drop here to open'
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
          {text} in New Window
          <Paper
            elevation={8}
            style={{
              position: 'absolute',
              top: '3rem'
            }}
          >
            {isOver && <Preview style={{ opacity: 1 }} />}
          </Paper>
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
