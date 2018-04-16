import React from 'react'
import { inject, observer } from 'mobx-react'
import { DropTarget } from 'react-dnd'
import Paper from 'material-ui/Paper'
import FlipMove from 'react-flip-move'
import Title from './Title'
import Preview from 'components/Preview'
import DraggableTab from 'components/Tab/DraggableTab'
import { ItemTypes } from 'libs'

@inject('dragStore')
@DropTarget(
  ItemTypes.TAB,
  {
    drop (props, monitor) {
      if (monitor.didDrop()) {
        return
      }
      const {
        win: { tabs },
        dragStore: { drop }
      } = props
      const tab = tabs[tabs.length - 1]
      drop(tab, false)
    }
  },
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver({ shallow: true })
  })
)
@observer
export default class Window extends React.Component {
  render () {
    const {
      connectDropTarget,
      isOver,
      win: { tabs, lastFocused },
      getScrollbars,
      dragPreview,
      left,
      right
    } = this.props
    const content = tabs.map(tab => (
      <DraggableTab
        key={tab.id}
        tab={tab}
        {...{ getScrollbars, dragPreview }}
      />
    ))
    const style = {
      minWidth: '20rem',
      padding: '0 1px',
      boxSizing: 'border-box',
      marginLeft: left && 'auto',
      marginRight: right && 'auto'
    }
    const dropIndicator = isOver && <Preview />
    const elevation = lastFocused ? 4 : 0
    return connectDropTarget(
      <div style={style}>
        <Paper elevation={elevation}>
          <Title {...this.props} />
          <FlipMove
            duration={256}
            easing='ease-in-out'
            appearAnimation='accordionHorizontal'
            enterAnimation='accordionHorizontal'
            leaveAnimation='accordionHorizontal'
          >
            {content}
          </FlipMove>
          {dropIndicator}
        </Paper>
      </div>
    )
  }
}
