import React from 'react'
import { inject, observer } from 'mobx-react'
import Icon from './Icon'
import Url from './Url'
import { match } from 'fuzzy'
import { withTheme } from 'material-ui/styles'
import { focusedColor, highlightColor, highlightBorderColor } from 'libs/colors'
import TabTooltip from './TabTooltip'
import TabTools from './TabTools'

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
  boxShadow: `-${indicatorWidth} 0px ${highlightColor}`,
  backgroundColor: highlightColor
}
const selectedStyle = {
  backgroundColor: focusedColor,
  boxShadow: `-${indicatorWidth} 0px ${focusedColor}`
}
const notMatchStyle = {
  opacity: 0.3
}
const pre = `<span style='color:${highlightBorderColor}'>`
const post = '</span>'

const getTargetValue = (lValue, rValue) => {
  if (lValue < 0) {
    return lValue
  }
  if (rValue < 0) {
    return -rValue
  }
  return 0
}

@withTheme()
@inject('userStore')
@inject('windowStore')
@inject('dragStore')
@observer
export default class Tab extends React.Component {
  node = React.createRef()

  componentDidMount () {
    const { faked } = this.props
    if (!faked) {
      window.requestAnimationFrame(this.props.tab.mounted)
    }
  }

  isActionable = () => {
    const {
      faked,
      dragStore: { dragging }
    } = this.props
    return !faked && !dragging
  }

  hover = () => {
    if (this.isActionable()) {
      this.props.tab.hover()
    }
  }

  unhover = () => {
    if (this.isActionable()) {
      this.props.tab.unhover()
    }
  }

  componentWillUnmount = this.unhover

  getStyle = () => {
    const { highlightDuplicatedTab } = this.props.userStore
    const {
      active,
      isFocused,
      isMatched,
      isSelected,
      shouldHighlight,
      urlCount
    } = this.props.tab
    return Object.assign(
      {},
      tabStyle,
      (active || shouldHighlight) && highlightStyle,
      isSelected && selectedStyle,
      isFocused && {
        borderLeft: `${indicatorWidth} ${
          this.props.theme.palette.secondary.main
        } solid`
      },
      !isMatched && notMatchStyle,
      urlCount > 1 &&
        highlightDuplicatedTab && {
        color: this.props.theme.palette.error.light
      },
      this.props.style
    )
  }

  getHighlightNode = text => {
    const {
      tab: { isMatched, query }
    } = this.props
    if (!isMatched || !query) {
      return text
    }
    const result = match(query, text, { pre, post })
    if (!result) {
      return <div>{text}</div>
    }
    return <div dangerouslySetInnerHTML={{ __html: result.rendered }} />
  }

  componentDidUpdate () {
    if (this.props.faked) {
      return
    }
    const { isFocused, isVisible } = this.props.tab
    if (isFocused && isVisible) {
      const scrollbars = this.props.getScrollbars()
      const containmentRect = scrollbars.getBoundingClientRect()
      const {
        top,
        bottom,
        left,
        right
      } = this.node.current.getBoundingClientRect()
      const height = bottom - top
      const topGap = top - 2 * height - containmentRect.top
      const bottomGap = containmentRect.bottom - bottom - 2 * height - 4
      const leftGap = left - 4 - containmentRect.left
      const rightGap = containmentRect.right - right - 32
      scrollbars.scrollTo({
        left: getTargetValue(leftGap, rightGap),
        top: getTargetValue(topGap, bottomGap)
      })
    }
  }

  render () {
    const { activate, title, pinned, isVisible } = this.props.tab
    const { showUrl } = this.props.userStore
    if (!isVisible) {
      return null
    }
    const style = this.getStyle()
    const pin = pinned && (
      <div
        style={{
          position: 'absolute',
          fontSize: '0.75rem',
          width: '1rem',
          transform: 'scaleX(-1)',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      >
        📌
      </div>
    )
    const content = (
      <div onClick={activate} style={{ flex: 1 }}>
        {this.getHighlightNode(title)}
        {showUrl && (
          <Url {...this.props} getHighlightNode={this.getHighlightNode} />
        )}
      </div>
    )
    return (
      <div
        ref={this.node}
        onMouseEnter={this.hover}
        onMouseOver={this.hover}
        onMouseLeave={this.unhover}
        style={style}
      >
        <div
          style={{
            display: 'flex',
            flex: '1 1 auto',
            overflow: 'hidden',
            textAlign: 'left',
            alignItems: 'center',
            textOverflow: 'ellipsis'
          }}
        >
          {pin}
          <Icon {...this.props} />
          <TabTooltip {...this.props}>{content}</TabTooltip>
          <TabTools {...this.props} />
        </div>
      </div>
    )
  }
}
