import React, { useRef, useEffect } from 'react'
import { observer } from 'mobx-react'
import Icon from 'components/Tab/Icon'
import TabTools from 'components/Tab/TabTools'
import TabContent from 'components/Tab/TabContent'
import CloseButton from 'components/CloseButton'
import classNames from 'classnames'
import { useStore } from 'components/StoreContext'
import { useTheme } from 'components/ThemeContext'

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

const Tab = observer((props) => {
  const node = useRef(null)
  const { dragStore } = useStore()
  const isDarkTheme = useTheme()
  const { faked, tab, className } = props
  const {
    active,
    isFocused,
    isMatched,
    isSelected,
    isVisible,
    pinned,
    shouldHighlight
  } = tab

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

  // useEffect(() => {
  //   if (!faked) {
  //     window.requestAnimationFrame(tab.mounted)
  //   }
  // }, [faked])

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
      className={classNames(
        'flex border-l-2 border-transparent',
        {
          'border-l-2 border-solid border-red-500': isFocused,
          'opacity-25': !isMatched
        },
        className,
        !className && [
          !isDarkTheme && {
            'hover:bg-blue-300': isActionable,
            'bg-blue-100': active || shouldHighlight,
            'bg-blue-300': isSelected
          },
          isDarkTheme && {
            'hover:bg-gray-800': isActionable,
            'bg-gray-800': active || shouldHighlight,
            'bg-gray-900': isSelected
          }
        ]
      )}
      onMouseEnter={onMouseEnter}
      onMouseOver={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {pin}
      <Icon tab={tab} />
      <TabContent {...{ faked, tab }} />
      <TabTools faked={faked} tab={tab} />
      <CloseButton onClick={onRemove} disabled={tab.removing} />
    </div>
  )
})

export default observer((props) => {
  if (!props.tab.isVisible) {
    return null
  }
  return <Tab {...props} />
})
