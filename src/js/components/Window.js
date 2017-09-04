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
        <h2>Tabs: {tabs.length}</h2>
        {content}
      </div>
    )
  }
}
