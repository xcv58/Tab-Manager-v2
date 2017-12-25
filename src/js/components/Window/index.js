import React from 'react'
import { inject, observer } from 'mobx-react'
import { DropTarget } from 'react-dnd'
import FlipMove from 'react-flip-move'
import Title from './Title'
import DraggableTab from 'components/Tab/DraggableTab'
import { ItemTypes, getBackground } from 'libs'

@inject('dragStore')
@observer
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
export default class Window extends React.Component {
  getBoundingClientRect = () => {
    if (this.node) {
      return this.node.getBoundingClientRect()
    }
  }

  render () {
    const {
      connectDropTarget, isOver, win: { tabs }, getWindowList, dragPreview, width
    } = this.props
    const content = tabs.map(tab => (
      <DraggableTab key={tab.id}
        tab={tab}
        {...{ getWindowList, dragPreview }}
      />
    ))
    const style = { width }
    const dropIndicator = isOver && (
      <div style={{
        background: getBackground(true),
        height: '2.5rem'
      }} />
    )
    return connectDropTarget(
      <div ref={(el) => { this.node = el || this.node }}
        style={style}>
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
      </div>
    )
  }
}
