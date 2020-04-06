import React, { useRef, useEffect } from 'react'
import { observer } from 'mobx-react'
import Icon from 'components/Tab/Icon'
import TabTools from 'components/Tab/TabTools'
import TabContent from 'components/Tab/TabContent'
import CloseButton from 'components/CloseButton'
import classNames from 'classnames'
import { useStore } from 'components/StoreContext'
import { useTheme } from 'components/ThemeContext'
import { useScrollbar } from 'libs/Scrollbar'

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

export default observer((props) => {
  const nodeRef = useRef(null)
  const { dragStore, searchStore } = useStore()
  const isDarkTheme = useTheme()
  const { faked, tab, className } = props
  const {
    setNodeRef,
    active,
    isFocused,
    isMatched,
    isSelected,
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

  const { scrollToNode } = useScrollbar()

  useEffect(() => {
    if (faked) {
      return
    }
    if (isFocused) {
      scrollToNode(nodeRef)
      if (!searchStore.typing) {
        nodeRef.current.focus()
      }
    }
    return onMouseLeave
  }, [faked, isFocused])
  useEffect(() => setNodeRef(nodeRef))

  const pin = pinned && PIN

  return (
    <div
      ref={nodeRef}
      tabIndex={-1}
      className={classNames(
        'flex',
        {
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
