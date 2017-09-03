import React from 'react'

export default class Tab extends React.Component {
  render () {
    const { title } = this.props
    return (
      <div style={{
        padding: 4,
        margin: 4,
        border: '1px red solid',
        whiteSpace: 'nowrap'
      }}>
        {title}
      </div>
    )
  }
}
