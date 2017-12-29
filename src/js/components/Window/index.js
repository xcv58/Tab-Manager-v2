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
      const { win: { tabs }, dragStore: { drop } } = props
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
  getBoundingClientRect = () => {
    if (this.node) {
      return this.node.getBoundingClientRect()
    }
  }

  render () {
    const {
      connectDropTarget, isOver, win: { tabs, lastFocused }, getWindowList, dragPreview, width
    } = this.props
    const content = tabs.map(tab => (
      <DraggableTab key={tab.id}
        tab={tab}
        {...{ getWindowList, dragPreview }}
      />
    ))
    const style = { width, padding: '0 2px', boxSizing: 'border-box' }
    const dropIndicator = isOver && (
      <Preview />
    )
    const elevation = lastFocused ? 4 : 0
    return connectDropTarget(
      <div ref={(el) => { this.node = el || this.node }}
        style={style}>
        <Paper elevation={elevation}>
          <Title {...this.props} />
          <FlipMove duration={256}
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
