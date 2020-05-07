import React, { useRef, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Icon from 'components/Tab/Icon'
import TabTools from 'components/Tab/TabTools'
import TabContent from 'components/Tab/TabContent'
import CloseButton from 'components/CloseButton'
import classNames from 'classnames'
import { useStore } from 'components/StoreContext'
import { useTheme } from 'components/ThemeContext'
import { useScrollbar } from 'libs/Scrollbar'
import { TabProps } from 'components/types'
import PIN from './Pin'

export default observer((props: TabProps & { className?: string }) => {
  const nodeRef = useRef(null)
  const { dragStore, searchStore } = useStore()
  const isDarkTheme = useTheme()
  const { tab, className } = props
  const {
    setNodeRef,
    active,
    isFocused,
    isMatched,
    isSelected,
    pinned,
    shouldHighlight
  } = tab

  const isActionable = !dragStore.dragging

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

  const { scrollToNode } = useScrollbar()

  useEffect(() => {
    if (isFocused) {
      scrollToNode(nodeRef)
      if (!searchStore.typing) {
        nodeRef.current.focus()
      }
    }
    return onMouseLeave
  }, [isFocused])
  useEffect(() => setNodeRef(nodeRef))

  const pin = pinned && PIN

  return (
    <div
      ref={nodeRef}
      tabIndex={-1}
      className={classNames(
        className,
        'flex',
        {
          'opacity-25': !isMatched
        },
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
      <TabContent tab={tab} />
      <TabTools tab={tab} />
      <CloseButton onClick={onRemove} disabled={tab.removing} />
    </div>
  )
})
