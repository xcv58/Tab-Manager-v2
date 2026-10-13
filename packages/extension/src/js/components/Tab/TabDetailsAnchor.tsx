import React, { useEffect, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from 'components/ui/Tooltip'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import { normalizeTabTooltipUrlLines } from 'libs/tabTooltip'
import { getWindowLabel } from 'libs/windowLabel'
import { getNoun } from 'libs'
import type Tab from 'stores/Tab'
import type { TabTooltipSurface } from 'stores/HoverStore'
import TabDetailsTooltip from './TabDetailsTooltip'

export default observer(function TabDetailsAnchor({
  tab,
  surface = 'list',
  anchorRef,
  children,
}: {
  tab: Tab
  surface?: TabTooltipSurface
  anchorRef?: React.RefObject<HTMLButtonElement>
  children: React.ReactElement<React.HTMLAttributes<HTMLButtonElement>>
}) {
  const {
    hoverStore,
    dragStore,
    userStore,
    shortcutStore,
    actionStore,
    tabGroupStore,
  } = useStore()
  const theme = useAppTheme()
  const localRef = useRef<HTMLButtonElement>(null)
  const buttonRef = anchorRef || localRef
  const tooltipId = React.useId()
  const ownsTooltip =
    hoverStore.hoveredTabId === tab.id && hoverStore.hoveredSurface === surface
  const blocked =
    dragStore.dragging ||
    userStore.dialogOpen ||
    shortcutStore?.dialogOpen ||
    actionStore?.paletteOpen ||
    Boolean(actionStore?.menu) ||
    !userStore.showTabTooltip
  const open = ownsTooltip && hoverStore.hovered && !blocked
  useEffect(() => {
    if (blocked && ownsTooltip) hoverStore.hideTooltip(tab.id, surface)
  }, [blocked, ownsTooltip, hoverStore, tab.id, surface])
  useEffect(
    () => () => hoverStore.hideTooltip(tab.id, surface),
    [hoverStore, tab.id, surface],
  )
  const closeTooltip = () => hoverStore.hideTooltip(tab.id, surface)
  const group = tabGroupStore?.hasTabGroupsApi?.()
    ? tabGroupStore.getTabGroup(tab.groupId)
    : null
  const duplicateText =
    userStore.highlightDuplicatedTab && tab.isDuplicated
      ? `${tab.duplicatedTabCount} ${getNoun('tab', tab.duplicatedTabCount)} share this page`
      : ''
  const anchor = React.cloneElement(children, {
    ref: buttonRef,
    'aria-haspopup': 'dialog',
    'aria-controls': open ? tooltipId : undefined,
    'aria-keyshortcuts': 'Alt+ArrowDown',
    onMouseEnter: (event: React.MouseEvent<HTMLButtonElement>) => {
      hoverStore.hover(tab.id, surface)
      children.props.onMouseEnter?.(event)
    },
    onMouseLeave: (event: React.MouseEvent<HTMLButtonElement>) => {
      hoverStore.unhover(tab.id, surface)
      children.props.onMouseLeave?.(event)
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (
        event.altKey &&
        event.key === 'ArrowDown' &&
        userStore.showTabTooltip
      ) {
        event.preventDefault()
        event.stopPropagation()
        hoverStore.openTooltip(tab.id, true, surface)
      } else children.props.onKeyDown?.(event)
    },
  } as React.HTMLAttributes<HTMLButtonElement> &
    React.RefAttributes<HTMLButtonElement>)
  return (
    <Tooltip
      open={open}
      title={
        open && (
          <TabDetailsTooltip
            title={tab.title}
            url={tab.url}
            urlLines={normalizeTabTooltipUrlLines(userStore.tabTooltipUrlLines)}
            duplicateText={duplicateText}
            groupTitle={group ? group.title || 'Unnamed group' : undefined}
            windowTitle={getWindowLabel(tab.win)}
            autoFocus={hoverStore.keyboardEntry}
            onClose={() => {
              closeTooltip()
              buttonRef.current?.focus()
            }}
          />
        )
      }
      id={tooltipId}
      role="dialog"
      aria-label="Tab details"
      data-testid="tab-details-tooltip"
      data-tab-details-panel
      disableInteractive={false}
      keepPosition
      onInteractionStart={() => hoverStore.holdTooltip(tab.id, surface)}
      onInteractionEnd={(nextTarget) => {
        const row = buttonRef.current?.closest(
          '[data-testid^="tab-row-"], [data-testid^="search-tab-row-"]',
        )
        hoverStore.releaseTooltip(
          tab.id,
          !!row?.contains(nextTarget as Node),
          surface,
        )
      }}
      onClose={closeTooltip}
      style={
        {
          width: 'min(380px, calc(100vw - 16px))',
          maxWidth: 'calc(100vw - 16px)',
          padding: 0,
          borderRadius: 12,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.2)',
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          whiteSpace: 'normal',
          '--tab-details-accent': theme.palette.primary.main,
          '--tab-details-muted': theme.palette.text.secondary,
          '--tab-details-hover': theme.palette.action.hover,
        } as React.CSSProperties
      }
    >
      {anchor}
    </Tooltip>
  )
})
