import React, { useRef, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Icon from 'components/Tab/Icon'
import TabTools from 'components/Tab/TabTools'
import TabContent from 'components/Tab/TabContent'
import CloseButton from 'components/CloseButton'
import RowActionSlot from 'components/RowActionSlot'
import classNames from 'classnames'
import { useStore } from 'components/hooks/useStore'
import { useTheme } from 'components/hooks/useTheme'
import { TabProps } from 'components/types'
import PIN from './Pin'
import DuplicateMarker from './DuplicateMarker'
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
  const isPrimaryActive = tab.active && !!tab.win?.lastFocused
  const showActiveIndicator = (tab.win?.tabs?.length || 0) > 1
  const activeIndicatorColor = tab.active
    ? isPrimaryActive
      ? isDarkTheme
        ? '#b5c7e6'
        : '#1a73e8'
      : isDarkTheme
        ? 'rgba(167, 188, 217, 0.72)'
        : 'rgba(91, 124, 173, 0.68)'
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
        color: '#eef1f5',
      }
    : {
        backgroundColor: isSelected
          ? 'rgba(26, 115, 232, 0.14)'
          : shouldHighlight
            ? 'rgba(26, 115, 232, 0.08)'
            : isActionable && isHovered
              ? 'rgba(15, 23, 42, 0.04)'
              : 'transparent',
        color: '#111827',
      }
  const rowStyle = isDarkTheme
    ? {
        ...darkRowStyle,
        ...(isFocused ? { outline: 'none' } : undefined),
      }
    : {
        ...darkRowStyle,
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
      className={classNames(className, 'flex relative items-center', {
        'opacity-25': !isMatched,
        'z-10': isFocused,
      })}
      style={rowStyle}
      onMouseEnter={onMouseEnter}
      onMouseOver={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {showActiveIndicator && activeIndicatorColor && (
        <span
          aria-hidden="true"
          data-testid={`tab-active-indicator-${tab.id}`}
          className="absolute z-10 block -translate-y-1/2 rounded-full pointer-events-none top-1/2"
          style={{
            backgroundColor: activeIndicatorColor,
            left: 2,
            width: 2,
            height: 16,
          }}
        />
      )}
      {pin}
      <Icon tab={tab} />
      <TabContent tab={tab} />
      <div className="flex h-10 shrink-0 items-center gap-0.5 pr-1">
        <TabTools tab={tab} />
        <RowActionSlot>
          <CloseButton
            onClick={onRemove}
            disabled={tab.removing}
            size="compact"
          />
        </RowActionSlot>
        <DuplicateMarker tab={tab} />
      </div>
      <ContainerOrGroupIndicator
        id={tab.id}
        groupId={tab.groupId}
        cookieStoreId={tab.cookieStoreId}
      />
      {isFocused && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 pointer-events-none"
          style={focusOutlineStyle}
        />
      )}
    </div>
  )
})
