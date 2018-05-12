import React from 'react'
import { inject, observer } from 'mobx-react'
import { match } from 'fuzzy'
import { withTheme } from 'material-ui/styles'
import { focusedColor, highlightColor, highlightBorderColor } from 'libs/colors'
import Icon from 'components/Tab/Icon'
import TabTooltip from 'components/Tab/TabTooltip'
import TabTools from 'components/Tab/TabTools'
import TabContent from 'components/Tab/TabContent'

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

  onMouseEnter = () => {
    if (this.isActionable()) {
      this.props.tab.hover()
    }
  }

  onMouseLeave = () => {
    if (this.isActionable()) {
      this.props.tab.unhover()
    }
  }

  componentWillUnmount = this.onMouseLeave

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
    const { pinned, isVisible } = this.props.tab
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
    return (
      <div
        ref={this.node}
        onMouseEnter={this.onMouseEnter}
        onMouseOver={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
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
          <TabTooltip {...this.props}>
            <TabContent {...this.props} />
          </TabTooltip>
          <TabTools {...this.props} />
        </div>
      </div>
    )
  }
}
