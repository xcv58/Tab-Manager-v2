import React from 'react'

export default class Url extends React.Component {
  render () {
    const {
      tab: { url },
      className,
      getHighlightNode
    } = this.props
    return <div className={className}>{getHighlightNode(url)}</div>
  }
}
