import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import ControlIconButton from 'components/ControlIconButton'
import Menu, { MenuDivider, MenuItem } from 'components/ui/Menu'
import Tooltip from 'components/ui/Tooltip'
import { useStore } from 'components/hooks/useStore'
import { WinProps } from 'components/types'
import { MoreHorizIcon } from 'icons/materialIcons'
import type { WindowEdge } from 'stores/DragStore'

export default observer(({ win }: WinProps) => {
  const { arrangeStore, dragStore, tabStore } = useStore()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const disabled =
    dragStore.pendingWindowEdgeDrop || !win.canDrop || !tabStore.selection.size
  const closeMenu = () => setAnchorEl(null)
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
        <ControlIconButton
          controlSize="compact"
          aria-label="Window actions"
          aria-haspopup="menu"
          aria-expanded={Boolean(anchorEl)}
          onClick={(event) => setAnchorEl(event.currentTarget)}
        >
          <MoreHorizIcon fontSize={16} />
        </ControlIconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        data-testid={`window-actions-menu-${win.id}`}
      >
        <MenuItem disabled={win.hide} onClick={sortTabs}>
          Sort tabs in this window
        </MenuItem>
        <MenuItem disabled={win.hide} onClick={reloadTabs}>
          Reload all tabs in this window
        </MenuItem>
        <MenuDivider />
        <MenuItem disabled={disabled} onClick={() => moveToEdge('beginning')}>
          Move selected tabs to beginning of this window
        </MenuItem>
        <MenuItem disabled={disabled} onClick={() => moveToEdge('end')}>
          Move selected tabs to end of this window
        </MenuItem>
      </Menu>
    </>
  )
})
