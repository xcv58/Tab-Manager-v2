import React from 'react'
import DraggableTab from './Tab/DraggableTab'
import { grey } from 'material-ui/colors'

const borderBottom = `1px solid ${grey[200]}`

export default class Window extends React.Component {
  getBoundingClientRect = () => {
    if (this.node) {
      return this.node.getBoundingClientRect()
    }
  }

  render () {
    const { tabs, containment, dragPreview } = this.props
    const content = tabs.map((tab) => (
      <DraggableTab key={tab.id} {...tab} {...{ containment, dragPreview }} />
    ))
    return (
      <div ref={(el) => { this.node = el || this.node }}>
        <div style={{
          borderBottom,
          paddingLeft: '2.5rem',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          {tabs.length} tab{tabs.length > 1 && 's'}
        </div>
        {content}
      </div>
    )
  }
}
