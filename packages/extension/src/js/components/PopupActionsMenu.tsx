import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import Divider from '@mui/material/Divider'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { MoreHorizIcon } from 'icons/materialIcons'
import ControlIconButton from 'components/ControlIconButton'
import { getNoun, openInNewTab, openOrTogglePopup } from 'libs'
import { useStore } from './hooks/useStore'

export default observer(() => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const { arrangeStore, shortcutStore, userStore, windowStore } = useStore()

  const closeMenu = () => {
    setAnchorEl(null)
  }

  const runAction = (action: () => void | Promise<void>) => () => {
    closeMenu()
    action()
  }

  const duplicatedTabsToRemoveCount =
    windowStore.getDuplicateTabsToRemoveCount()

  return (
    <>
      <ControlIconButton
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-label="More actions"
      >
        <MoreHorizIcon fontSize={20} />
      </ControlIconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={runAction(openOrTogglePopup)}>
          Open full feature mode
        </MenuItem>
        <MenuItem onClick={runAction(openInNewTab)}>Open in new tab</MenuItem>
        <Divider />
        <MenuItem onClick={runAction(() => arrangeStore.groupTabs())}>
          Cluster ungrouped & sort tabs
        </MenuItem>
        <MenuItem
          disabled={duplicatedTabsToRemoveCount === 0}
          onClick={runAction(() => windowStore.cleanDuplicatedTabs())}
        >
          {duplicatedTabsToRemoveCount
            ? `Clean ${duplicatedTabsToRemoveCount} duplicate ${getNoun(
                'tab',
                duplicatedTabsToRemoveCount,
              )}`
            : 'Clean duplicated tabs'}
        </MenuItem>
        <Divider />
        <MenuItem onClick={runAction(() => shortcutStore.openDialog())}>
          Keyboard shortcuts
        </MenuItem>
        <MenuItem onClick={runAction(() => userStore.openDialog())}>
          Settings
        </MenuItem>
      </Menu>
    </>
  )
})
