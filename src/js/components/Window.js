import React from 'react'
import Tab from './Tab'

export default class Window extends React.Component {
  render () {
    const { tabs } = this.props
    const content = tabs.map((tab) => (
      <Tab key={tab.id} {...tab} />
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
