import { canMoveTabs } from 'libs/browserCapabilities'
import React from 'react'
import { observer } from 'mobx-react-lite'
import ControlIconButton from 'components/ControlIconButton'
import Menu, { MenuDivider, MenuItem, MenuSection } from 'components/ui/Menu'
import { useActionMenu } from 'components/hooks/useActionMenu'
import Tooltip from 'components/ui/Tooltip'
import { useStore } from 'components/hooks/useStore'
import { WinProps } from 'components/types'
import {
  MoreHorizIcon,
  RefreshIcon,
  SortIcon,
  CloseIcon,
  ExpandMoreIcon,
  ChevronRightIcon,
} from 'icons/materialIcons'
import { ArrowDownIcon, ArrowUpIcon } from 'icons/actionIcons'
import { getNoun } from 'libs'
import type { WindowEdge } from 'stores/DragStore'
import MoveShortcut from 'components/Shortcut/MoveShortcut'
import { getTabMoveAriaShortcut } from 'libs/tabMoveShortcuts'
import { getTabMoveDestinationHint } from 'libs/tabMovePlan'

export default observer(({ win }: WinProps) => {
  const { arrangeStore, dragStore, tabStore } = useStore()
  const menu = useActionMenu(`window-${win.id}`, win)
  const selectedCount = tabStore.selection.size
  const moveScope = selectedCount
    ? `${selectedCount} selected ${getNoun('tab', selectedCount)}`
    : 'selected tabs'
  const disabled =
    dragStore.pendingWindowEdgeDrop ||
    !tabStore.selection.size ||
    Boolean(getTabMoveDestinationHint(win, tabStore.selection.values()))
  const closeMenu = menu.onClose
  const moveToEdge = (position: WindowEdge) => {
    closeMenu()
    dragStore.moveSelectedTabsToWindowEdge(win.id, position)
  }
  const sortTabs = () => {
    closeMenu()
    arrangeStore.sortTabs(win.id)
  }
  const reloadTabs = () => {
    closeMenu()
    win.reload()
  }

  return (
    <>
      <Tooltip title="Window actions">
        <span className="inline-flex">
          <ControlIconButton
            controlSize="compact"
            aria-label="Window actions"
            aria-haspopup="menu"
            aria-expanded={menu.open}
            onClick={menu.onOpen}
          >
            <MoreHorizIcon fontSize={16} />
          </ControlIconButton>
        </span>
      </Tooltip>
      <Menu {...menu} data-testid={`window-actions-menu-${win.id}`}>
        <MenuSection>
          This window{win.tabs ? ` · ${win.tabs.length} tabs` : ''}
        </MenuSection>
        {canMoveTabs && (
          <MenuItem disabled={win.hide} onClick={sortTabs}>
            <SortIcon fontSize={18} /> Sort tabs
          </MenuItem>
        )}
        <MenuItem disabled={win.hide} onClick={reloadTabs}>
          <RefreshIcon fontSize={18} /> Reload all{' '}
          {win.tabs ? `${win.tabs.length} ` : ''}tabs
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            win.toggleHide()
          }}
        >
          {win.hide ? (
            <ChevronRightIcon fontSize={18} />
          ) : (
            <ExpandMoreIcon fontSize={18} />
          )}{' '}
          {win.hide ? 'Expand' : 'Collapse'} this window
        </MenuItem>
        {canMoveTabs && (
          <>
            <MenuDivider />
            <MenuSection>Move {moveScope} here</MenuSection>
            <MenuItem
              disabled={disabled}
              onClick={() => moveToEdge('beginning')}
              aria-keyshortcuts={getTabMoveAriaShortcut('beginning')}
              aria-label={`Move ${moveScope} to beginning`}
            >
              <ArrowUpIcon fontSize={18} />
              <span className="flex-1">Beginning</span>
              <MoveShortcut position="beginning" />
            </MenuItem>
            <MenuItem
              disabled={disabled}
              onClick={() => moveToEdge('end')}
              aria-keyshortcuts={getTabMoveAriaShortcut('end')}
              aria-label={`Move ${moveScope} to end`}
            >
              <ArrowDownIcon fontSize={18} />
              <span className="flex-1">End</span>
              <MoveShortcut position="end" />
            </MenuItem>
          </>
        )}
        <MenuDivider />
        <MenuItem
          onClick={() => {
            closeMenu()
            win.close()
          }}
        >
          <CloseIcon fontSize={18} /> Close this window
        </MenuItem>
      </Menu>
    </>
  )
})
