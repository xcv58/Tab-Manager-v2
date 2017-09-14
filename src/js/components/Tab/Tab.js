import React from 'react'
import { inject, observer } from 'mobx-react'
import { blue, red } from 'material-ui/colors'
import Icon from './Icon'
import { match } from 'fuzzy'

const indicatorWidth = '2px'
const tabStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  whiteSpace: 'nowrap',
  marginLeft: indicatorWidth,
  borderLeft: `${indicatorWidth} transparent solid`,
  boxShadow: `-${indicatorWidth} 0px white`
}
const highlightStyle = {
  backgroundColor: blue[100],
  boxShadow: `-${indicatorWidth} 0px ${blue[100]}`
}
const focusedStyle = {
  borderLeft: `${indicatorWidth} ${red[500]} solid`
}
const notMatchStyle = {
  opacity: 0.3
}

@inject('searchStore')
@inject('tabStore')
@observer
export default class Tab extends React.Component {
  state = { hover: false }

  onMouseEnter = () => this.setState({ hover: true })

  onMouseLeave = () => this.setState({ hover: false })

  onClick = () => {
    this.props.searchStore.focus(this.props)
    this.props.tabStore.activate(this.props)
  }

  getStyle = () => {
    const {
      id,
      tabStore: { selection },
      searchStore: { query, matchedSet, focusedTab }
    } = this.props
    const styles = [ tabStyle ]
    if (selection.has(id)) {
      styles.push(highlightStyle)
    }
    if (focusedTab === id) {
      styles.push(focusedStyle)
    }
    if (Boolean(query) && !matchedSet.has(id)) {
      styles.push(notMatchStyle)
    }
    return Object.assign({}, ...styles)
  }

  getUrlStyle = () => {
    const { id, searchStore: { query, matchedSet, focusedTab } } = this.props
    const urlStyle = {
      opacity: 0.3,
      fontSize: '0.7rem'
    }
    if (Boolean(query) && !matchedSet.has(id)) {
      return urlStyle
    }
    if (this.state.hover || (id === focusedTab)) {
      urlStyle.opacity = 1
    }
    return urlStyle
  }

  getHighlightNode = (text) => {
    const { id, searchStore: { query, matchedSet } } = this.props
    if (!query || !matchedSet.has(id)) {
      return text
    }
    const result = match(this.props.searchStore.query, text, {
      pre: `<span style='color:${red[500]}'>`,
      post: '</span>'
    })
    if (!result) {
      return text
    }
    return (
      <div dangerouslySetInnerHTML={{ __html: result.rendered }} />
    )
  }

  componentDidUpdate () {
    const {
      faked, id, searchStore: { focusedTab, searchTriggered, scrolled }
    } = this.props
    if (!faked && id === focusedTab) {
      const containmentRect = this.props.containment().getBoundingClientRect()
      const { top, bottom } = this.node.getBoundingClientRect()
      const topGap = top - containmentRect.top
      const bottomGap = containmentRect.bottom - bottom
      if (topGap > 0 && bottomGap > 0) {
        return
      }
      const scrollOption = {
        block: 'end',
        inline: 'start',
        behavior: 'smooth'
      }
      if (searchTriggered) {
        scrollOption.behavior = 'auto'
        scrolled()
      }
      this.node.scrollIntoView(scrollOption)
    }
  }

  render () {
    const { title, url, pinned } = this.props
    const style = this.getStyle()
    const pin = pinned && (
      <div style={{
        padding: '0 1rem'
      }}>
        📌
      </div>
    )
    return (
      <div ref={(node) => { this.node = node }}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        style={style}>
        <div style={{ display: 'flex' }}>
          <Icon {...this.props} />
          <div
            onClick={this.onClick}
            style={{
              overflow: 'hidden',
              textAlign: 'left',
              textOverflow: 'ellipsis'
            }}>
            {this.getHighlightNode(title)}
            <div style={this.getUrlStyle()}>
              {this.getHighlightNode(url)}
            </div>
          </div>
        </div>
        {pin}
      </div>
    )
  }
}
