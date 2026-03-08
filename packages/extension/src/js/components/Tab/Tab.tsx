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
    isHovered,
    pinned,
    shouldHighlight,
  } = tab

  const isActionable = !dragStore.dragging

  const onMouseEnter = React.useCallback(() => {
    if (isActionable) {
      tab.hover()
    }
  }, [isActionable, tab])

  const onMouseLeave = React.useCallback(() => {
    if (isActionable) {
      tab.unhover()
    }
  }, [isActionable, tab])

  const onRemove = React.useCallback(() => {
    const { removing, remove } = tab
    if (!removing) {
      remove()
    }
  }, [tab])

  const reduceMotion = useReduceMotion()

  useEffect(() => {
    if (isFocused) {
      if (!searchStore.typing) {
        nodeRef.current.focus({ preventScroll: true })
        nodeRef.current.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'end',
          inline: 'nearest',
        })
      }
    }
    return onMouseLeave
  }, [isFocused])
  useEffect(() => {
    setNodeRef(nodeRef)
  })

  const pin = pinned && PIN
  const isSecondaryActive =
    tab.active && !tab.win?.lastFocused && (tab.win?.tabs?.length || 0) > 1
  const secondaryActiveStyle =
    isSecondaryActive && !isSelected && !isFocused
      ? {
          boxShadow: isDarkTheme
            ? 'inset 2px 0 0 rgba(174, 181, 192, 0.28)'
            : 'inset 2px 0 0 rgba(100, 116, 139, 0.382)',
        }
      : undefined
  const darkRowStyle = isDarkTheme
    ? {
        backgroundColor: isSelected
          ? 'rgba(181, 199, 230, 0.2)'
          : shouldHighlight
            ? 'rgba(181, 199, 230, 0.14)'
            : isActionable && isHovered
              ? 'rgba(238, 241, 245, 0.08)'
              : 'transparent',
        borderBottom: '1px solid transparent',
        color: '#eef1f5',
      }
    : undefined
  const rowStyle = isDarkTheme
    ? {
        ...darkRowStyle,
        ...secondaryActiveStyle,
        ...(isFocused ? { outline: 'none' } : undefined),
      }
    : {
        ...secondaryActiveStyle,
        ...(isFocused ? { outline: 'none' } : undefined),
      }
  const focusOutlineStyle = isFocused
    ? {
        boxShadow: `inset 0 0 0 2px ${isDarkTheme ? '#b5c7e6' : '#1a73e8'}`,
      }
    : undefined

  return (
    <div
      ref={nodeRef}
      tabIndex={-1}
      data-testid={`tab-row-${tab.id}`}
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
        ],
      )}
      style={rowStyle}
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
        id={tab.id}
        groupId={tab.groupId}
        cookieStoreId={tab.cookieStoreId}
      />
      {isFocused && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 rounded-sm"
          style={focusOutlineStyle}
        />
      )}
    </div>
  )
})
