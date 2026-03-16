import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import MoreHoriz from '@mui/icons-material/MoreHoriz'
import { getNoun, openInNewTab, TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const MORE_TITLE = 'More actions'
const INVERT_TITLE = 'Inverse select tabs'
const RELOAD_TITLE = 'Reload select tab(s)'

export default observer(() => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const {
    hasFocusedOrSelectedTab,
    reload,
    searchStore,
    shortcutStore,
    windowStore,
  } = useStore()

  const closeMenu = () => {
    setAnchorEl(null)
  }

  const runAction = (action: () => void | Promise<void>) => () => {
    closeMenu()
    action()
  }

  const duplicatedTabsToRemoveCount =
    windowStore.getDuplicateTabsToRemoveCount()
  const cleanDuplicatedTitle = duplicatedTabsToRemoveCount
    ? `Clean ${duplicatedTabsToRemoveCount} duplicate ${getNoun(
        'tab',
        duplicatedTabsToRemoveCount,
      )}`
    : 'Clean duplicated tabs'

  return (
    <>
      <Tooltip title={MORE_TITLE} enterDelay={TOOLTIP_DELAY}>
        <div className="flex">
          <IconButton
            onClick={(event) => setAnchorEl(event.currentTarget)}
            className="focus:outline-none"
            aria-label={MORE_TITLE}
          >
            <MoreHoriz />
          </IconButton>
        </div>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={runAction(openInNewTab)}>Open in new tab</MenuItem>
        <MenuItem onClick={runAction(() => windowStore.syncAllWindows())}>
          Sync all windows
        </MenuItem>
        <Divider />
        <MenuItem
          disabled={searchStore.matchedTabs.length === 0}
          onClick={runAction(searchStore.invertSelect)}
        >
          {INVERT_TITLE}
        </MenuItem>
        <MenuItem
          disabled={!hasFocusedOrSelectedTab}
          onClick={runAction(reload)}
        >
          {RELOAD_TITLE}
        </MenuItem>
        <MenuItem
          disabled={duplicatedTabsToRemoveCount === 0}
          onClick={runAction(() => windowStore.cleanDuplicatedTabs())}
        >
          {cleanDuplicatedTitle}
        </MenuItem>
        <Divider />
        <MenuItem onClick={runAction(() => shortcutStore.openDialog())}>
          Keyboard shortcuts
        </MenuItem>
      </Menu>
    </>
  )
})
