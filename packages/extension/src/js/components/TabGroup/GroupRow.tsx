import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import classNames from 'classnames'
import { useDrop } from 'react-dnd'
import type { DropTargetMonitor } from 'react-dnd'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useTheme } from '@mui/material'
import { useStore } from 'components/hooks/useStore'
import { WindowRow } from 'stores/TabGroupStore'
import GroupEditorPopover from './GroupEditorPopover'
import { getChromeTabGroupColor } from 'libs/chromeTabGroupColors'
import { ItemTypes } from 'libs/react-dnd'
import DropIndicator from 'components/DropIndicator'
import GroupDragHandle from './GroupDragHandle'

type Props = {
  row: Extract<WindowRow, { kind: 'group' }>
}

export default observer((props: Props) => {
  const { row } = props
  const { tabGroupStore, searchStore, windowStore, dragStore } = useStore()
  const theme = useTheme()
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [editorAnchorEl, setEditorAnchorEl] = useState<HTMLElement | null>(null)
  const tabGroup = tabGroupStore.getTabGroup(row.groupId)
  if (!tabGroup) {
    return null
  }
  const headerRef = useRef<HTMLDivElement | null>(null)
  const [headerDropMode, setHeaderDropMode] = useState<
    'join-group' | 'before-group'
  >('join-group')

  const groupColorId = (tabGroup.color || 'grey') as chrome.tabGroups.ColorEnum
  const groupColor = getChromeTabGroupColor(groupColorId)

  const onToggle = () => {
    tabGroupStore.toggleCollapsed(row.groupId)
  }

  const onUngroup = () => {
    tabGroupStore.ungroup(row.groupId)
  }

  const onMoveToTop = () => {
    tabGroupStore.moveGroup(row.groupId, {
      windowId: row.windowId,
      index: 0,
    })
  }

  const onMoveToBottom = () => {
    tabGroupStore.moveGroup(row.groupId, {
      windowId: row.windowId,
      index: -1,
    })
  }

  const onMoveToAnotherWindow = () => {
    if (!window.prompt) {
      return
    }
    const availableWindowIds = windowStore.windows
      .filter((win) => win.canDrop && win.id !== row.windowId)
      .map((win) => win.id)
    if (!availableWindowIds.length) {
      return
    }
    const targetWindowId = Number(
      window.prompt(
        `Move to window ID (${availableWindowIds.join(', ')})`,
        String(availableWindowIds[0]),
      ),
    )
    if (!availableWindowIds.includes(targetWindowId)) {
      return
    }
    tabGroupStore.moveGroup(row.groupId, {
      windowId: targetWindowId,
      index: -1,
    })
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

  const setDropRef = useCallback(
    (node: HTMLDivElement | null) => {
      headerRef.current = node
      drop(node)
    },
    [drop],
  )

  return (
    <>
      <div
        ref={setDropRef}
        className={classNames(
          'group/tab-group sticky z-10 px-2 pt-1 pb-0 border-b',
          'bg-white border-gray-100',
        )}
        data-testid={`tab-group-header-${row.groupId}`}
      >
        {dropIndicator}
        <div className="flex items-center gap-1 pb-1">
          <button
            className="flex min-w-0 flex-1 items-center py-0.5 text-left"
            onClick={onToggle}
            data-testid={`tab-group-toggle-${row.groupId}`}
          >
            <span className="mr-1 text-gray-500">
              {tabGroup.collapsed ? (
                <ChevronRightIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </span>
            <span
              className="inline-flex min-h-[1.75rem] max-w-[14rem] items-center truncate rounded-full px-4 py-1 text-sm font-medium leading-5"
              style={{
                backgroundColor: groupColor.line,
                color: groupColor.chipText,
              }}
              data-testid={`tab-group-title-${row.groupId}`}
            >
              {row.title}
            </span>
            <span
              className="ml-2 text-xs opacity-70"
              data-testid={`tab-group-count-${row.groupId}`}
            >
              {countLabel}
            </span>
            {tabGroup.shared && (
              <span
                className="ml-2 px-1 py-0.5 text-xs border rounded opacity-80"
                data-testid={`tab-group-shared-${row.groupId}`}
              >
                Shared
              </span>
            )}
          </button>
          <GroupDragHandle
            groupId={row.groupId}
            className={classNames(
              'opacity-0 pointer-events-none transition-opacity',
              'group-hover/tab-group:opacity-100 group-hover/tab-group:pointer-events-auto',
              'group-focus-within/tab-group:opacity-100 group-focus-within/tab-group:pointer-events-auto',
            )}
          />
          <IconButton
            onClick={(event) => setMenuAnchorEl(event.currentTarget)}
            className="focus:outline-none"
            data-testid={`tab-group-menu-${row.groupId}`}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </div>
        <div
          className="mx-0 h-px"
          style={{ backgroundColor: groupColor.line }}
          data-testid={`tab-group-bar-${row.groupId}`}
        />
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
        <MenuItem
          data-testid={`tab-group-menu-toggle-${row.groupId}`}
          onClick={() => {
            setMenuAnchorEl(null)
            onToggle()
          }}
        >
          {tabGroup.collapsed ? 'Expand group' : 'Collapse group'}
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
        <Divider />
        <MenuItem
          data-testid={`tab-group-menu-move-top-${row.groupId}`}
          onClick={() => {
            setMenuAnchorEl(null)
            onMoveToTop()
          }}
        >
          Move group to top
        </MenuItem>
        <MenuItem
          data-testid={`tab-group-menu-move-bottom-${row.groupId}`}
          onClick={() => {
            setMenuAnchorEl(null)
            onMoveToBottom()
          }}
        >
          Move group to bottom
        </MenuItem>
        <MenuItem
          data-testid={`tab-group-menu-move-window-${row.groupId}`}
          onClick={() => {
            setMenuAnchorEl(null)
            onMoveToAnotherWindow()
          }}
        >
          Move group to another window
        </MenuItem>
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
      </Popover>
      <GroupEditorPopover
        anchorEl={editorAnchorEl}
        groupId={row.groupId}
        initialColor={groupColorId}
        initialTitle={tabGroup.title || ''}
        open={Boolean(editorAnchorEl)}
        onClose={() => setEditorAnchorEl(null)}
        onRename={(title) => {
          tabGroupStore.renameGroup(row.groupId, title)
        }}
        onRecolor={(color) => {
          tabGroupStore.recolorGroup(row.groupId, color)
        }}
      />
    </>
  )
})
