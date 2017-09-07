import React from 'react'
import DraggableTab from './Tab/DraggableTab'

export default class Window extends React.Component {
  getBoundingClientRect = () => {
    if (this.node) {
      return this.node.getBoundingClientRect()
    }
  }

  render () {
    const { tabs, containment } = this.props
    const content = tabs.map((tab) => (
      <DraggableTab key={tab.id} {...tab} {...{ containment }} />
    ))
    return (
      <div ref={(el) => { this.node = el || this.node }}>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          Tabs: {tabs.length}
        </div>
        {content}
      </div>
    )
  }
}
