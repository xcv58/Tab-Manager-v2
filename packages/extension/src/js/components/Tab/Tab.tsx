import React, { useRef, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Icon from 'components/Tab/Icon'
import TabTools from 'components/Tab/TabTools'
import TabContent from 'components/Tab/TabContent'
import CloseButton from 'components/CloseButton'
import classNames from 'classnames'
import { useStore } from 'components/hooks/useStore'
import { useTheme } from 'components/hooks/useTheme'
import { TabProps } from 'components/types'
import PIN from './Pin'
import ContainerOrGroupIndicator from './ContainerOrGroupIndicator'
import useReduceMotion from 'libs/useReduceMotion'

export default observer((props: TabProps & { className?: string }) => {
  const nodeRef = useRef(null)
  const { dragStore, searchStore } = useStore()
  const isDarkTheme = useTheme()
  const { tab, className } = props
  const {
    setNodeRef,
    isFocused,
    isMatched,
    isSelected,
    pinned,
    shouldHighlight,
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

  const reduceMotion = useReduceMotion()

  useEffect(() => {
    if (isFocused) {
      if (!searchStore.typing) {
        nodeRef.current.focus({ preventScroll: true })
        nodeRef.current.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
        })
      }
    }
    return onMouseLeave
  }, [isFocused])
  useEffect(() => {
    setNodeRef(nodeRef)
  })

  const pin = pinned && PIN

  return (
    <div
      ref={nodeRef}
      tabIndex={-1}
      className={classNames(
        className,
        'flex relative items-center',
        {
          'opacity-25': !isMatched,
        },
        !className && [
          !isDarkTheme && {
            'hover:bg-blue-300': isActionable,
            'bg-blue-100': shouldHighlight,
            'bg-blue-300': isSelected,
          },
          isDarkTheme && {
            'hover:bg-gray-800': isActionable,
            'bg-gray-800': shouldHighlight,
            'bg-gray-900': isSelected,
          },
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
      <ContainerOrGroupIndicator
        groupId={tab.groupId}
        cookieStoreId={tab.cookieStoreId}
      />
    </div>
  )
})
