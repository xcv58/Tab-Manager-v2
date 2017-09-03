import React from 'react'

export default class Window extends React.Component {
  render () {
    console.log('tab:', this.props)
    return (
      <div style={{
        border: '1px red solid',
        whiteSpace: 'nowrap'
      }}>
        {this.props.title}
      </div>
    )
  }
}
