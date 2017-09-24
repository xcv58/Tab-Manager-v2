import React from 'react'
import FlipMove from 'react-flip-move'
import Title from './Title'
import DraggableTab from '../Tab/DraggableTab'

export default class Window extends React.Component {
  getBoundingClientRect = () => {
    if (this.node) {
      return this.node.getBoundingClientRect()
    }
  }

  render () {
    const { tabs, getWindowList, dragPreview } = this.props
    const content = tabs.map(tab => (
      <DraggableTab key={tab.id}
        {...tab}
        {...{ getWindowList, dragPreview }}
      />
    ))
    return (
      <div ref={(el) => { this.node = el || this.node }}>
        <Title {...this.props} />
        <FlipMove duration={256}
          easing='ease-in-out'
          appearAnimation='accordionHorizontal'
          enterAnimation='accordionHorizontal'
          leaveAnimation='accordionHorizontal'>
          {content}
        </FlipMove>
      </div>
    )
  }
}
