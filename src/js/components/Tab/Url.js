import React from 'react'

const urlStyle = {
  opacity: 0.3,
  fontSize: '0.7rem'
}

export default class Url extends React.Component {
  getUrlStyle = () => Object.assign(
    {},
    urlStyle,
    this.props.tab.shouldHighlight && { opacity: 1 }
  )

  render () {
    const { tab: { url }, getHighlightNode } = this.props
    return (
      <div style={this.getUrlStyle()}>
        {getHighlightNode(url)}
      </div>
    )
  }
}
