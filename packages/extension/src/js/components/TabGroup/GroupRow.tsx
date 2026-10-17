import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import classNames from 'classnames'
import {
  contextMenuHandlers,
  useActionMenu,
} from 'components/hooks/useActionMenu'
import Menu, { MenuItem, MenuDivider } from 'components/ui/Menu'
import {
  MoreVertIcon,
  ChevronRightIcon,
  ExpandMoreIcon,
} from 'icons/materialIcons'
import { useAppTheme } from 'libs/appTheme'
import { useStore } from 'components/hooks/useStore'
import CloseButton from 'components/CloseButton'
import RowActionSlot from 'components/RowActionSlot'
import RowActionRail from 'components/RowActionRail'
import { WindowRow } from 'stores/TabGroupStore'
import Window from 'stores/Window'
import GroupEditorPopover from './GroupEditorPopover'
import { getChromeTabGroupColor } from 'libs/chromeTabGroupColors'
import HeaderEdgeDropTarget from 'components/HeaderEdgeDropTarget'
import GroupDragHandle from './GroupDragHandle'
import ControlIconButton from 'components/ControlIconButton'
import HighlightNode from 'components/HighlightNode'
import { browser } from 'libs'
import {
  DEFAULT_CONTROL_SIZE,
  MIN_INTERACTIVE_ROW_HEIGHT,
} from 'libs/layoutMetrics'
import { getUiColorTokens } from 'libs/uiColorTokens'

type Props = {
  row: Extract<WindowRow, { kind: 'group' }>
  win: Window
}

export default observer((props: Props) => {
  const { row, win } = props
  const {
    tabGroupStore,
    searchStore,
    windowStore,
    dragStore,
    focusStore,
    userStore,
    actionStore,
  } = useStore()
  const theme = useAppTheme()
  const uiColors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  const isDarkMode = theme.mode === 'dark'
  const isClassicUi = userStore.uiPreset === 'classic'
  const [editorAnchorEl, setEditorAnchorEl] = useState<HTMLElement | null>(null)
  const [isHeaderHovered, setIsHeaderHovered] = useState(false)
  const [isHeaderFocusWithin, setIsHeaderFocusWithin] = useState(false)
  const [isToggleHovered, setIsToggleHovered] = useState(false)
  const [isToggleFocused, setIsToggleFocused] = useState(false)
  const tabGroup = tabGroupStore.getTabGroup(row.groupId)
  const groupRow = win.getGroupRow(row.groupId)
  const menu = useActionMenu(`group-${row.groupId}`, groupRow)
  const menuAnchorEl = menu.anchorEl
  const closeMenu = menu.onClose
  const canMutateGroups = !!tabGroupStore?.canMutateGroups?.()
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const groupColorId = (tabGroup?.color ||
    row.color ||
    'grey') as chrome.tabGroups.ColorEnum
  const groupColor = getChromeTabGroupColor(groupColorId)
  const collapsed = tabGroup?.collapsed ?? row.collapsed
  const groupTabs = tabGroupStore.getTabsForGroup(row.groupId)
  const duplicatedTabsToRemoveInGroup =
    windowStore.getDuplicateTabsToRemoveCount(groupTabs)

  const onToggle = () => {
    if (!canMutateGroups) {
      return
    }
    tabGroupStore.toggleCollapsed(row.groupId)
  }

  const onToggleClick = useCallback(() => {
    focusStore.focus(groupRow, { origin: 'mouse', reveal: false })
    onToggle()
  }, [focusStore, groupRow, onToggle])

  const onUngroup = () => {
    if (!canMutateGroups) {
      return
    }
    tabGroupStore.ungroup(row.groupId)
  }

  const onCleanDuplicatesInGroup = () => {
    if (!duplicatedTabsToRemoveInGroup) {
      return
    }
    windowStore.cleanDuplicateTabs(groupTabs)
  }

  const onCloseGroup = () => {
    const tabIds = groupTabs.map((tab) => tab.id)
    if (!tabIds.length) {
      return
    }
    windowStore.removeTabs(tabIds)
    browser.tabs.remove(tabIds)
  }

  const countLabel = useMemo(() => {
    if (searchStore.queryActive && row.matchedCount !== row.tabIds.length) {
      return `${row.matchedCount}/${row.tabIds.length}`
    }
    return `${row.tabIds.length}`
  }, [row.matchedCount, row.tabIds.length, searchStore.queryActive])

  const showGroupDragHandle =
    isClassicUi ||
    isHeaderHovered ||
    isHeaderFocusWithin ||
    (dragStore.dragging && dragStore.dragSource === 'group-header')
  const showGroupControls =
    !dragStore.dragging &&
    (isClassicUi ||
      isHeaderHovered ||
      isHeaderFocusWithin ||
      Boolean(menuAnchorEl) ||
      Boolean(editorAnchorEl))
  const showToggleAffordance =
    !dragStore.dragging && (isToggleHovered || isToggleFocused)
  const isFocused = groupRow.isFocused
  // Changing the source row during native dragstart cancels WebKit's drag.
  // It cannot be its own group destination, so keep its original header.
  const isDragOrigin = dragStore.dragOriginGroupId === row.groupId

  useEffect(() => {
    groupRow.setNodeRef(nodeRef)
  }, [groupRow])
  useEffect(() => {
    if (isFocused && nodeRef.current) {
      if (groupRow.shouldMoveDomFocus) {
        nodeRef.current?.focus({ preventScroll: true })
      }
      if (
        groupRow.shouldMoveDomFocus &&
        groupRow.shouldRevealOnFocus &&
        focusStore.shouldRevealNode(nodeRef.current)
      ) {
        nodeRef.current?.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
          inline: 'nearest',
        })
      }
    }
  }, [
    focusStore,
    groupRow,
    groupRow.focusRequestId,
    groupRow.shouldMoveDomFocus,
    groupRow.shouldRevealOnFocus,
    isFocused,
  ])

  return (
    <>
      <div
        ref={nodeRef}
        tabIndex={-1}
        className={classNames(
          'group/tab-group group-drop-header sticky relative border-b',
          {
            'z-20': isFocused,
          },
        )}
        {...contextMenuHandlers(actionStore, `group-${row.groupId}`, groupRow)}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
        onFocusCapture={() => {
          setIsHeaderFocusWithin(true)
          if (!groupRow.isFocused) {
            focusStore.focus(groupRow, {
              origin: 'keyboard',
              reveal: false,
              moveDomFocus: false,
            })
          }
        }}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget as Node | null
          if (!event.currentTarget.contains(nextTarget)) {
            setIsHeaderFocusWithin(false)
          }
        }}
        style={{
          backgroundColor: uiColors.headerSurface,
          borderColor: theme.palette.divider,
        }}
        data-testid={`tab-group-header-${row.groupId}`}
      >
        <div
          className="flex min-h-10 items-center gap-1"
          style={{
            minHeight: MIN_INTERACTIVE_ROW_HEIGHT,
            // Keep the native drag source rendered while its overlay is active.
            opacity: dragStore.dragging && !isDragOrigin ? 0 : undefined,
            pointerEvents:
              dragStore.dragging && !isDragOrigin ? 'none' : undefined,
          }}
        >
          <button
            className="flex h-10 min-w-0 flex-1 items-center rounded-sm text-left focus:outline-none"
            onClick={onToggleClick}
            disabled={dragStore.dragging}
            onFocus={() => setIsToggleFocused(true)}
            onMouseEnter={() => setIsToggleHovered(true)}
            onMouseLeave={() => setIsToggleHovered(false)}
            onBlur={() => setIsToggleFocused(false)}
            data-testid={`tab-group-toggle-${row.groupId}`}
            style={{ minHeight: MIN_INTERACTIVE_ROW_HEIGHT }}
          >
            <span
              className="mr-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-150"
              style={{
                width: DEFAULT_CONTROL_SIZE,
                height: DEFAULT_CONTROL_SIZE,
                backgroundColor: showToggleAffordance
                  ? theme.palette.action.hover
                  : 'transparent',
                color: showToggleAffordance
                  ? theme.palette.text.primary
                  : theme.palette.text.secondary,
              }}
            >
              {collapsed ? (
                <ChevronRightIcon fontSize={18} />
              ) : (
                <ExpandMoreIcon fontSize={18} />
              )}
            </span>
            <span
              className="inline-flex h-6 max-w-[14rem] items-center truncate px-2 text-sm font-medium leading-5"
              style={{
                backgroundColor: groupColor.line,
                color: groupColor.chipText,
                borderRadius: 9,
              }}
              data-testid={`tab-group-title-${row.groupId}`}
            >
              <HighlightNode
                query={searchStore.tabHighlightQuery}
                text={row.title}
                mode={searchStore.tabHighlightMatchMode}
                inline
              />
            </span>
            <span
              className="ml-2 text-xs opacity-70"
              style={{ color: theme.palette.text.secondary }}
              data-testid={`tab-group-count-${row.groupId}`}
            >
              {countLabel}
            </span>
            {tabGroup?.shared && (
              <span
                className="ml-2 px-1 py-0.5 text-xs border rounded opacity-80"
                style={{
                  color: theme.palette.text.secondary,
                  borderColor: isDarkMode ? theme.palette.grey[700] : undefined,
                }}
                data-testid={`tab-group-shared-${row.groupId}`}
              >
                Shared
              </span>
            )}
          </button>
          <RowActionRail>
            <RowActionSlot visible={showGroupControls}>
              <ControlIconButton
                onClick={menu.onOpen}
                aria-haspopup="menu"
                aria-expanded={menu.open}
                controlSize="compact"
                aria-label="Group actions"
                data-testid={`tab-group-menu-${row.groupId}`}
              >
                <MoreVertIcon fontSize={16} />
              </ControlIconButton>
            </RowActionSlot>
            <RowActionSlot visible={canMutateGroups && showGroupDragHandle}>
              {canMutateGroups && (
                <GroupDragHandle
                  groupId={row.groupId}
                  className={classNames('transition-opacity')}
                />
              )}
            </RowActionSlot>
            <RowActionSlot visible={showGroupControls}>
              <CloseButton
                onClick={onCloseGroup}
                size="compact"
                aria-label="Close group"
              />
            </RowActionSlot>
          </RowActionRail>
        </div>
        {dragStore.dragging && !isDragOrigin && (
          <div
            className="group-header-drop-targets window-header-drop-targets absolute inset-0 z-30 flex text-sm font-semibold"
            style={
              {
                '--window-header-full-count-width': 'clamp(5rem, 32%, 10rem)',
                '--window-header-compact-count-width':
                  'clamp(5rem, 32%, 10rem)',
              } as React.CSSProperties
            }
            data-testid={`group-header-drop-targets-${row.groupId}`}
          >
            <HeaderEdgeDropTarget
              win={win}
              groupId={row.groupId}
              position="beginning"
            />
            <HeaderEdgeDropTarget
              win={win}
              groupId={row.groupId}
              position="end"
            />
            <span
              className="window-header-drop-count group-header-drop-identity pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1 rounded px-1.5 py-1"
              style={{
                backgroundColor: groupColor.line,
                color: groupColor.chipText,
              }}
              aria-label={`${row.title}, ${row.tabIds.length} tabs`}
            >
              <span className="min-w-0 truncate">{row.title}</span>
              <span className="shrink-0 text-xs">{countLabel}</span>
            </span>
          </div>
        )}
        <div
          className="mx-0 h-px"
          style={{ backgroundColor: groupColor.line }}
          data-testid={`tab-group-bar-${row.groupId}`}
        />
        {isFocused && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-sm"
            style={{
              boxShadow: `0 0 0 2px ${uiColors.focusRing}`,
            }}
          />
        )}
      </div>
      <Menu
        {...menu}
        data-testid={`group-actions-menu-${row.groupId}`}
        style={{ zIndex: theme.zIndex.tooltip + 1 }}
      >
        {canMutateGroups && (
          <>
            <MenuItem
              data-testid={`tab-group-menu-toggle-${row.groupId}`}
              onClick={() => {
                closeMenu()
                onToggle()
              }}
            >
              {collapsed ? 'Expand group' : 'Collapse group'}
            </MenuItem>
            <MenuItem
              data-testid={`tab-group-menu-rename-${row.groupId}`}
              onClick={() => {
                setEditorAnchorEl(menuAnchorEl)
                closeMenu()
              }}
            >
              Edit group…
            </MenuItem>
          </>
        )}
        {canMutateGroups && (
          <>
            {duplicatedTabsToRemoveInGroup > 0 && (
              <>
                <MenuDivider />
                <MenuItem
                  data-testid={`tab-group-menu-clean-duplicates-${row.groupId}`}
                  onClick={() => {
                    closeMenu()
                    onCleanDuplicatesInGroup()
                  }}
                >
                  Close {duplicatedTabsToRemoveInGroup} duplicate
                  {duplicatedTabsToRemoveInGroup > 1 ? ' tabs' : ' tab'}
                </MenuItem>
              </>
            )}
            <MenuDivider />
            <MenuItem
              data-testid={`tab-group-menu-ungroup-${row.groupId}`}
              onClick={() => {
                closeMenu()
                onUngroup()
              }}
            >
              Ungroup tabs
            </MenuItem>
          </>
        )}
      </Menu>
      {canMutateGroups && (
        <GroupEditorPopover
          anchorEl={editorAnchorEl}
          groupId={row.groupId}
          initialColor={groupColorId}
          initialTitle={tabGroup?.title || row.title || ''}
          open={Boolean(editorAnchorEl)}
          onClose={() => setEditorAnchorEl(null)}
          onRename={(title) => {
            tabGroupStore.renameGroup(row.groupId, title)
          }}
          onRecolor={(color) => {
            tabGroupStore.recolorGroup(row.groupId, color)
          }}
        />
      )}
    </>
  )
})
