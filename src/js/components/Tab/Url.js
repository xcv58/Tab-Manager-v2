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
    const {
      id,
      searchStore: { matchedSet, focusedTab },
      tabStore: { hoveredTab }
    } = this.props
    if (matchedSet.has(id) && ((id === hoveredTab) || (id === focusedTab))) {
      return { ...urlStyle, opacity: 1 }
    }
    return urlStyle
  }

  render () {
    const { url, getHighlightNode } = this.props
    return (
      <div style={this.getUrlStyle()}>
        {getHighlightNode(url)}
      </div>
    )
  }
}
