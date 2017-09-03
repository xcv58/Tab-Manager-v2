import React from 'react'
import Tab from './Tab'

export default class Window extends React.Component {
  render () {
    console.log(this.props)
    const { id, tabs } = this.props
    const content = tabs.map((tab) => (
      <Tab key={tab.id} {...tab} />
    ))
    return (
      <div>
        <h1>window: {id}</h1>
        {content}
      </div>
    )
  }
}
