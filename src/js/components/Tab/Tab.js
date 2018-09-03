import React from 'react'
import { inject, observer } from 'mobx-react'
import { withStyles } from '@material-ui/core/styles'
import Icon from 'components/Tab/Icon'
import TabTooltip from 'components/Tab/TabTooltip'
import TabTools from 'components/Tab/TabTools'
import TabContent from 'components/Tab/TabContent'
import classNames from 'classnames'

const indicatorWidth = '2px'

const styles = theme => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    whiteSpace: 'nowrap',
    marginLeft: indicatorWidth,
    borderLeft: `${indicatorWidth} transparent solid`,
    boxShadow: `-${indicatorWidth} 0px white`
  },
  highlight: {
    boxShadow: `-${indicatorWidth} 0px ${theme.app.highlightColor}`,
    backgroundColor: theme.app.highlightColor
  },
  selected: {
    backgroundColor: theme.app.focusedColor,
    boxShadow: `-${indicatorWidth} 0px ${theme.app.focusedColor}`
  },
  focused: {
    borderLeft: `${indicatorWidth} ${theme.palette.secondary.main} solid`
  },
  notMatch: {
    opacity: 0.3
  },
  duplicated: {
    color: theme.palette.error.light
  }
})

const getTargetValue = (lValue, rValue) => {
  if (lValue < 0) {
    return lValue
  }
  if (rValue < 0) {
    return -rValue
  }
  return 0
}

@withStyles(styles)
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

  getClassName = () => {
    const { highlightDuplicatedTab } = this.props.userStore
    const {
      active,
      isFocused,
      isMatched,
      isSelected,
      shouldHighlight,
      urlCount
    } = this.props.tab
    const { classes } = this.props
    return classNames(
      classes.root,
      (active || shouldHighlight) && classes.highlight,
      isSelected && classes.selected,
      isFocused && classes.focused,
      !isMatched && classes.notMatch,
      urlCount > 1 && highlightDuplicatedTab && classes.duplicated
    )
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
    const className = this.getClassName()
    const { style } = this.props
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
        className={className}
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
