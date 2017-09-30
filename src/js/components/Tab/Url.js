import React from 'react'
import { inject, observer } from 'mobx-react'

const urlStyle = {
  opacity: 0.3,
  fontSize: '0.7rem'
}

@inject('searchStore')
@inject('tabStore')
@observer
export default class Url extends React.Component {
  getUrlStyle = () => {
    const { tab: { isMatched, isHovered, isFocused } } = this.props
    if (isMatched && (isHovered || isFocused)) {
      return { ...urlStyle, opacity: 1 }
    }
    return urlStyle
  }

  render () {
    const { tab: { url }, getHighlightNode } = this.props
    return (
      <div style={this.getUrlStyle()}>
        {getHighlightNode(url)}
      </div>
    )
  }
}
