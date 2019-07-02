import React, { useRef, useEffect } from 'react'
import { observer } from 'mobx-react'
import { withStyles } from '@material-ui/core/styles'
import Icon from 'components/Tab/Icon'
import TabTooltip from 'components/Tab/TabTooltip'
import TabTools from 'components/Tab/TabTools'
import TabContent from 'components/Tab/TabContent'
import CloseButton from 'components/CloseButton'
import classNames from 'classnames'
import { useStore } from 'components/StoreContext'

const indicatorWidth = '2px'

const styles = theme => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    whiteSpace: 'nowrap',
    marginLeft: indicatorWidth,
    borderLeft: `${indicatorWidth} transparent solid`
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

const PIN = (
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

const Tab = observer(props => {
  const node = useRef(null)
  const { dragStore } = useStore()
  const { faked, tab, classes, style } = props
  const {
    active,
    isFocused,
    isMatched,
    isSelected,
    isVisible,
    pinned,
    shouldHighlight
  } = tab

  if (!isVisible) {
    return null
  }

  const className = classNames(
    classes.root,
    (active || shouldHighlight) && classes.highlight,
    isSelected && classes.selected,
    isFocused && classes.focused,
    !isMatched && classes.notMatch
  )

  const isActionable = !faked && !dragStore.dragging

  const onMouseEnter = () => {
    if (isActionable) {
      tab.hover()
    }
  }

  const onMouseLeave = () => {
    if (isActionable) {
      tab.unhover()
    }
  }

  const onRemove = () => {
    const { removing, remove } = tab
    if (!removing) {
      remove()
    }
  }

  useEffect(() => {
    if (!faked) {
      window.requestAnimationFrame(tab.mounted)
    }
  }, [faked])

  useEffect(() => {
    if (faked) {
      return
    }
    if (isFocused && isVisible) {
      const scrollbars = props.getScrollbars()
      const containmentRect = scrollbars.getBoundingClientRect()
      const { top, bottom, left, right } = node.current.getBoundingClientRect()
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
    return onMouseLeave
  }, [faked, isFocused, isVisible])

  const pin = pinned && PIN
  return (
    <div
      ref={node}
      onMouseEnter={onMouseEnter}
      onMouseOver={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
        <Icon tab={tab} />
        <TabTooltip faked={faked} tab={tab}>
          <TabContent tab={tab} />
        </TabTooltip>
        <TabTools faked={faked} tab={tab} />
        <CloseButton onClick={onRemove} disabled={tab.removing} />
      </div>
    </div>
  )
})

export default withStyles(styles)(Tab)
