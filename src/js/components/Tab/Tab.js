import React from 'react'
import { inject, observer } from 'mobx-react'
import { blue, red, grey } from 'material-ui/colors'
import Icon from './Icon'
import Url from './Url'
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
  backgroundColor: grey[100]
}
const selectedStyle = {
  backgroundColor: blue[100],
  boxShadow: `-${indicatorWidth} 0px ${blue[100]}`
}
const focusedStyle = {
  borderLeft: `${indicatorWidth} ${red[500]} solid`
}
const notMatchStyle = {
  opacity: 0.3
}

const getTargetValue = (lValue, rValue) => {
  if (lValue < 0) {
    return lValue
  }
  if (rValue < 0) {
    return -rValue
  }
  return 0
}

@inject('dragStore')
@inject('searchStore')
@inject('tabStore')
@observer
export default class Tab extends React.Component {
  onMouseEnter = () => this.props.tab.hover()
  onMouseLeave = () => this.props.tab.unhover()

  onClick = () => {
    const { tab, searchStore: { focus }, tabStore: { activate } } = this.props
    focus(tab)
    activate(tab)
  }

  getStyle = () => {
    const {
      dragStore: { dragging },
      tab: { active, isFocused, isMatched, isSelected, shouldHighlight }
    } = this.props
    return Object.assign(
      {},
      tabStyle,
      !dragging && (active || shouldHighlight) && highlightStyle,
      isSelected && selectedStyle,
      isFocused && focusedStyle,
      !isMatched && notMatchStyle
    )
  }

  getHighlightNode = (text) => {
    const { tab: { isMatched }, searchStore: { query } } = this.props
    if (!isMatched || !query) {
      return text
    }
    const result = match(query, text, {
      pre: `<span style='color:${red[500]}'>`,
      post: '</span>'
    })
    if (!result) {
      return (
        <div>{text}</div>
      )
    }
    return (
      <div dangerouslySetInnerHTML={{ __html: result.rendered }} />
    )
  }

  componentDidUpdate () {
    const {
      faked, tab: { id }, searchStore: { focusedTab }
    } = this.props
    if (!faked && id === focusedTab) {
      const { shadowScrollbars } = this.props.getWindowList().refs
      const containmentRect = shadowScrollbars.node.getBoundingClientRect()
      const { top, bottom, left, right } = this.node.getBoundingClientRect()
      const height = bottom - top
      const topGap = top - (2 * height) - containmentRect.top
      const bottomGap = containmentRect.bottom - bottom - height
      const leftGap = left - 2 - containmentRect.left
      const rightGap = containmentRect.right - right
      shadowScrollbars.scrollTo({
        left: getTargetValue(leftGap, rightGap),
        top: getTargetValue(topGap, bottomGap)
      })
    }
  }

  render () {
    const { title, pinned } = this.props.tab
    const style = this.getStyle()
    const pin = pinned && (
      <div style={{
        position: 'absolute',
        fontSize: '0.75rem',
        width: '1rem',
        transform: 'scaleX(-1)',
        zIndex: 1,
        pointerEvents: 'none'
      }}>
        📌
      </div>
    )
    return (
      <div ref={(node) => { this.node = node }}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        style={style}>
        <div style={{
          display: 'flex',
          flex: '1 1 auto',
          overflow: 'hidden',
          textAlign: 'left',
          textOverflow: 'ellipsis'
        }}>
          {pin}
          <Icon {...this.props} />
          <div onClick={this.onClick}
            style={{
              overflow: 'hidden',
              flex: '1 1 auto',
              textOverflow: 'ellipsis'
            }}>
            {this.getHighlightNode(title)}
            <Url {...this.props} getHighlightNode={this.getHighlightNode} />
          </div>
        </div>
      </div>
    )
  }
}
