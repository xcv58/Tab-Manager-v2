import React, { useRef, useEffect } from 'react'
import { reaction } from 'mobx'
import { observer } from 'mobx-react-lite'
import Icon from 'components/Tab/Icon'
import TabTools from 'components/Tab/TabTools'
import TabContent from 'components/Tab/TabContent'
import CloseButton from 'components/CloseButton'
import RowActionSlot from 'components/RowActionSlot'
import RowActionRail from 'components/RowActionRail'
import classNames from 'classnames'
import { useStore } from 'components/hooks/useStore'
import { useTheme } from 'components/hooks/useTheme'
import { TabProps } from 'components/types'
import { getTabRowColorTokens } from 'libs/uiColorTokens'
import PIN from './Pin'
import DuplicateMarker from './DuplicateMarker'
import ContainerOrGroupIndicator from './ContainerOrGroupIndicator'

export default observer((props: TabProps & { className?: string }) => {
  const nodeRef = useRef(null)
  const { dragStore, searchStore, focusStore, userStore } = useStore()
  const isDarkTheme = useTheme()
  const colorTokens = getTabRowColorTokens(isDarkTheme, userStore.uiPreset)
  const isClassicUi = userStore.uiPreset === 'classic'
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

  useEffect(() => {
    return reaction(
      () => ({
        isFocused: tab.isFocused,
        focusRequestId: tab.focusRequestId,
        shouldMoveDomFocus: tab.shouldMoveDomFocus,
        shouldRevealOnFocus: tab.shouldRevealOnFocus,
        typing: searchStore.typing,
      }),
      ({
        isFocused: nextIsFocused,
        shouldMoveDomFocus,
        shouldRevealOnFocus,
        typing,
      }) => {
        if (!nextIsFocused || typing || !nodeRef.current) {
          return
        }
        if (shouldMoveDomFocus) {
          nodeRef.current.focus({ preventScroll: true })
        }
        if (
          shouldMoveDomFocus &&
          shouldRevealOnFocus &&
          focusStore.shouldRevealNode(nodeRef.current)
        ) {
          nodeRef.current.scrollIntoView({
            behavior: 'auto',
            block: 'nearest',
            inline: 'nearest',
          })
        }
      },
      {
        fireImmediately: true,
      },
    )
  }, [focusStore, searchStore, tab])

  useEffect(() => onMouseLeave, [onMouseLeave])
  useEffect(() => {
    setNodeRef(nodeRef)
  }, [setNodeRef])

  const pin = pinned && PIN
  const isPrimaryActive = tab.active && !!tab.win?.lastFocused
  const showActiveIndicator = (tab.win?.tabs?.length || 0) > 1
  const activeIndicatorColor = tab.active
    ? isPrimaryActive
      ? colorTokens.activeIndicatorPrimary
      : colorTokens.activeIndicatorSecondary
    : undefined
  const rowStyle = {
    backgroundColor: isSelected
      ? colorTokens.selectedBackground
      : shouldHighlight
        ? colorTokens.highlightedBackground
        : colorTokens.rowSurface,
    color: colorTokens.primaryText,
    ...(isFocused ? { outline: 'none' } : undefined),
  }
  const focusOutlineStyle = isFocused
    ? {
        boxShadow: `inset 0 0 0 2px ${colorTokens.focusRing}`,
      }
    : undefined

  return (
    <div
      ref={nodeRef}
      tabIndex={-1}
      data-testid={`tab-row-${tab.id}`}
      className={classNames(
        className,
        'group/tab-row flex relative items-center transition-colors duration-150',
        {
          'opacity-25': !isMatched,
          'z-10': isFocused,
          'hover:bg-blue-300': isActionable && !isDarkTheme && isClassicUi,
          'hover:bg-gray-800': isActionable && isDarkTheme && isClassicUi,
          'hover:bg-[rgba(15,23,42,0.04)]':
            isActionable && !isDarkTheme && !isClassicUi,
          'hover:bg-[rgba(238,241,245,0.08)]':
            isActionable && isDarkTheme && !isClassicUi,
        },
      )}
      style={rowStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {showActiveIndicator && activeIndicatorColor && (
        <span
          aria-hidden="true"
          data-testid={`tab-active-indicator-${tab.id}`}
          className="absolute z-10 block -translate-y-1/2 rounded-full pointer-events-none top-1/2"
          style={{
            backgroundColor: activeIndicatorColor,
            left: 1,
            width: 3,
            height: 25,
          }}
        />
      )}
      {pin}
      <Icon tab={tab} disableSequentialFocus={props.disableSequentialFocus} />
      <TabContent
        tab={tab}
        disableSequentialFocus={props.disableSequentialFocus}
      />
      <RowActionRail tail={<DuplicateMarker tab={tab} />}>
        <TabTools
          tab={tab}
          disableSequentialFocus={props.disableSequentialFocus}
        />
        <RowActionSlot>
          <CloseButton
            onClick={onRemove}
            disabled={tab.removing}
            tabIndex={props.disableSequentialFocus ? -1 : undefined}
            size="compact"
          />
        </RowActionSlot>
      </RowActionRail>
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
