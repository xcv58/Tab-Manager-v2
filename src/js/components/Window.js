import React from 'react'
import DraggableTab from './DraggableTab'

export default class Window extends React.Component {
  render () {
    const { tabs, containment } = this.props
    const content = tabs.map((tab) => (
      <DraggableTab key={tab.id} {...tab} {...{ containment }} />
    ))
    return (
      <div>
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
