import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import classNames from 'classnames'
import { useDrop } from 'react-dnd'
import type { DropTargetMonitor } from 'react-dnd'
import Popover from '@mui/material/Popover'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useTheme } from '@mui/material'
import { useStore } from 'components/hooks/useStore'
import CloseButton from 'components/CloseButton'
import RowActionSlot from 'components/RowActionSlot'
import RowActionRail from 'components/RowActionRail'
import { WindowRow } from 'stores/TabGroupStore'
import Window from 'stores/Window'
import GroupEditorPopover from './GroupEditorPopover'
import { getChromeTabGroupColor } from 'libs/chromeTabGroupColors'
import { ItemTypes } from 'libs/react-dnd'
import DropIndicator from 'components/DropIndicator'
import GroupDragHandle from './GroupDragHandle'
import ControlIconButton from 'components/ControlIconButton'
import { browser } from 'libs'
import {
  DEFAULT_CONTROL_SIZE,
  MIN_INTERACTIVE_ROW_HEIGHT,
} from 'libs/layoutMetrics'

type Props = {
  row: Extract<WindowRow, { kind: 'group' }>
  win: Window
}

export default observer((props: Props) => {
  const { row, win } = props
  const { tabGroupStore, searchStore, windowStore, dragStore, focusStore } =
    useStore()
  const theme = useTheme()
  const isDarkMode = theme.palette.mode === 'dark'
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [editorAnchorEl, setEditorAnchorEl] = useState<HTMLElement | null>(null)
  const [isHeaderHovered, setIsHeaderHovered] = useState(false)
  const [isHeaderFocusWithin, setIsHeaderFocusWithin] = useState(false)
  const [isToggleHovered, setIsToggleHovered] = useState(false)
  const [isToggleFocused, setIsToggleFocused] = useState(false)
  const tabGroup = tabGroupStore.getTabGroup(row.groupId)
  const groupRow = win.getGroupRow(row.groupId)
  const canMutateGroups = !!tabGroupStore?.canMutateGroups?.()
  const headerRef = useRef<HTMLDivElement | null>(null)
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const [headerDropMode, setHeaderDropMode] = useState<
    'join-group' | 'before-group'
  >('join-group')

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

  const onToggleFocus = useCallback(() => {
    setIsToggleFocused(true)
    focusStore.focus(groupRow, {
      origin: 'keyboard',
      reveal: false,
      moveDomFocus: false,
    })
  }, [focusStore, groupRow])

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
    if (searchStore._query && row.matchedCount !== row.tabIds.length) {
      return `${row.matchedCount}/${row.tabIds.length}`
    }
    return `${row.tabIds.length}`
  }, [row.matchedCount, row.tabIds.length, searchStore._query])

  const getGroupStartIndex = useCallback(() => {
    const groupTabs = tabGroupStore
      .getTabsForGroup(row.groupId)
      .slice()
      .sort((a, b) => a.index - b.index)
    return groupTabs[0]?.index ?? 0
  }, [row.groupId, tabGroupStore])

  const getHeaderDropMode = useCallback((monitor: DropTargetMonitor) => {
    const clientOffset = monitor.getClientOffset()
    const node = headerRef.current
    if (!clientOffset || !node) {
      return 'join-group' as const
    }
    const rect = node.getBoundingClientRect()
    const topZoneHeight = Math.min(14, Math.max(8, rect.height * 0.25))
    if (clientOffset.y <= rect.top + topZoneHeight) {
      return 'before-group' as const
    }
    return 'join-group' as const
  }, [])

  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    canDrop: () => {
      const targetWin = windowStore.windows.find(
        (win) => win.id === row.windowId,
      )
      return !!targetWin && targetWin.canDrop
    },
    hover: (_, monitor) => {
      if (!monitor.isOver({ shallow: true })) {
        return
      }
      setHeaderDropMode(getHeaderDropMode(monitor))
    },
    drop: (_, monitor) => {
      if (monitor.didDrop()) {
        return
      }
      const groupStartIndex = getGroupStartIndex()
      const dropMode = getHeaderDropMode(monitor)
      if (dropMode === 'before-group') {
        const fromGroupHeaderDrag = dragStore.dragSource === 'group-header'
        dragStore.dropAt({
          windowId: row.windowId,
          index: groupStartIndex,
          forceUngroup: !fromGroupHeaderDrag,
          source: fromGroupHeaderDrag ? 'group-header' : 'window-zone',
        })
        return
      }
      dragStore.dropAt({
        windowId: row.windowId,
        index: groupStartIndex,
        targetGroupId: row.groupId,
        before: true,
        source: 'group-header',
      })
    },
    collect: (monitor) => ({
      canDrop: monitor.canDrop(),
      isOver: monitor.isOver({ shallow: true }),
    }),
  })
  const { canDrop, isOver } = dropProps
  useEffect(() => {
    if (!isOver) {
      setHeaderDropMode('join-group')
    }
  }, [isOver])
  const dropIndicator =
    canDrop && isOver && headerDropMode === 'before-group' ? (
      <DropIndicator position="before" />
    ) : null
  const showGroupDragHandle =
    isHeaderHovered ||
    isHeaderFocusWithin ||
    (dragStore.dragging && dragStore.dragSource === 'group-header')
  const showGroupControls =
    isHeaderHovered ||
    isHeaderFocusWithin ||
    Boolean(menuAnchorEl) ||
    Boolean(editorAnchorEl)
  const showToggleAffordance = isToggleHovered || isToggleFocused
  const isFocused = groupRow.isFocused

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

  const setDropRef = useCallback(
    (node: HTMLDivElement | null) => {
      headerRef.current = node
      nodeRef.current = node
      drop(node)
    },
    [drop],
  )

  return (
    <>
      <div
        ref={setDropRef}
        tabIndex={-1}
        className={classNames('group/tab-group sticky relative border-b', {
          'z-20': isFocused,
        })}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
        onFocusCapture={() => setIsHeaderFocusWithin(true)}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget as Node | null
          if (!event.currentTarget.contains(nextTarget)) {
            setIsHeaderFocusWithin(false)
          }
        }}
        style={{
          backgroundColor:
            theme.palette.mode === 'dark' ? '#373d46' : '#f6f8fc',
          borderColor: theme.palette.divider,
        }}
        data-testid={`tab-group-header-${row.groupId}`}
      >
        {dropIndicator}
        <div
          className="flex min-h-10 items-center gap-1"
          style={{ minHeight: MIN_INTERACTIVE_ROW_HEIGHT }}
        >
          <button
            className="flex h-10 min-w-0 flex-1 items-center rounded-sm text-left focus:outline-none"
            onClick={onToggleClick}
            onFocus={onToggleFocus}
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
                <ChevronRightIcon sx={{ fontSize: 18 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 18 }} />
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
              {row.title}
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
                onClick={(event) => setMenuAnchorEl(event.currentTarget)}
                controlSize="compact"
                aria-label="Group actions"
                data-testid={`tab-group-menu-${row.groupId}`}
              >
                <MoreVertIcon sx={{ fontSize: 16 }} />
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
              boxShadow: `0 0 0 2px ${
                theme.palette.mode === 'dark' ? '#b5c7e6' : '#1a73e8'
              }`,
            }}
          />
        )}
      </div>
      <Popover
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        style={{ zIndex: theme.zIndex.tooltip + 1 }}
      >
        {canMutateGroups && (
          <>
            <MenuItem
              data-testid={`tab-group-menu-toggle-${row.groupId}`}
              onClick={() => {
                setMenuAnchorEl(null)
                onToggle()
              }}
            >
              {collapsed ? 'Expand group' : 'Collapse group'}
            </MenuItem>
            <MenuItem
              data-testid={`tab-group-menu-rename-${row.groupId}`}
              onClick={() => {
                setEditorAnchorEl(menuAnchorEl)
                setMenuAnchorEl(null)
              }}
            >
              Rename group
            </MenuItem>
            <MenuItem
              data-testid={`tab-group-menu-recolor-${row.groupId}`}
              onClick={() => {
                setEditorAnchorEl(menuAnchorEl)
                setMenuAnchorEl(null)
              }}
            >
              Change color
            </MenuItem>
          </>
        )}
        {canMutateGroups && (
          <>
            {duplicatedTabsToRemoveInGroup > 0 && (
              <>
                <Divider />
                <MenuItem
                  data-testid={`tab-group-menu-clean-duplicates-${row.groupId}`}
                  onClick={() => {
                    setMenuAnchorEl(null)
                    onCleanDuplicatesInGroup()
                  }}
                >
                  Clean {duplicatedTabsToRemoveInGroup} duplicate
                  {duplicatedTabsToRemoveInGroup > 1 ? ' tabs' : ' tab'}
                </MenuItem>
              </>
            )}
            <Divider />
            <MenuItem
              data-testid={`tab-group-menu-ungroup-${row.groupId}`}
              onClick={() => {
                setMenuAnchorEl(null)
                onUngroup()
              }}
            >
              Ungroup tabs
            </MenuItem>
          </>
        )}
      </Popover>
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
