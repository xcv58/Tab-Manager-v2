import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import Menu, { MenuDivider, MenuItem, MenuSection } from 'components/ui/Menu'
import IconButton from 'components/ui/IconButton'
import {
  DeleteSweepIcon,
  FilterListIcon,
  FlipIcon,
  HelpIcon,
  MoreHorizIcon,
  SettingsSharpIcon,
} from 'icons/materialIcons'
import { useAppTheme } from 'libs/appTheme'

export default observer(function ToolbarActionsMenu({
  showLabel,
  onOpenChange,
}: {
  showLabel: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const {
    tabStore,
    searchStore,
    arrangeStore,
    windowStore,
    userStore,
    shortcutStore,
  } = useStore()
  const theme = useAppTheme()
  const matchCount = searchStore.matchedTabs.length
  const duplicateCount = windowStore.getDuplicateTabsToRemoveCount()
  const closeMenu = () => {
    setAnchorEl(null)
    onOpenChange(false)
  }
  const run = (action: () => void | Promise<void>) => () => {
    closeMenu()
    void action()
  }
  const matching = searchStore.queryActive
  const iconSpace = (
    <span aria-hidden="true" className="shrink-0" style={{ width: 18 }} />
  )

  return (
    <>
      <IconButton
        aria-label="More toolbar actions"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchorEl)}
        onClick={(event) => {
          setAnchorEl(event.currentTarget)
          onOpenChange(true)
        }}
        style={{
          width: showLabel ? 'auto' : 36,
          height: 36,
          padding: '0 8px',
          gap: 6,
          borderRadius: 6,
        }}
      >
        <MoreHorizIcon fontSize={20} />
        {showLabel && <span className="toolbar-action-label">More</span>}
      </IconButton>
      <Menu open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={closeMenu}>
        <MenuSection>Selection</MenuSection>
        <MenuItem
          disabled={!matchCount}
          onClick={run(() => searchStore.toggleSelectAll())}
        >
          {iconSpace}
          {searchStore.allTabSelected ? 'Deselect' : 'Select'} all {matchCount}{' '}
          {matching ? 'matching ' : ''}
          {matchCount === 1 ? 'tab' : 'tabs'}
        </MenuItem>
        <MenuItem
          disabled={!matchCount}
          onClick={run(() => searchStore.invertSelect())}
        >
          <FlipIcon fontSize={18} />{' '}
          {matching ? 'Invert matching tab selection' : 'Invert tab selection'}
        </MenuItem>
        <MenuItem
          disabled={!tabStore.selection.size}
          onClick={run(() => tabStore.unselectAll())}
        >
          {iconSpace}Clear selection
        </MenuItem>
        <MenuDivider />
        <MenuSection>Across windows</MenuSection>
        <MenuItem onClick={run(() => arrangeStore.groupTabs())}>
          <FilterListIcon fontSize={18} /> Cluster ungrouped &amp; sort tabs
        </MenuItem>
        <MenuItem
          disabled={!duplicateCount}
          onClick={run(() => windowStore.cleanDuplicatedTabs())}
          style={{
            color:
              theme.mode === 'dark'
                ? theme.palette.danger.hoverColor
                : theme.palette.danger.activeColor,
          }}
        >
          <DeleteSweepIcon fontSize={18} /> Close {duplicateCount} duplicate{' '}
          {duplicateCount === 1 ? 'tab' : 'tabs'}
        </MenuItem>
        <MenuDivider />
        <MenuSection>Application</MenuSection>
        <MenuItem onClick={run(() => userStore.openDialog())}>
          <SettingsSharpIcon fontSize={18} /> Settings
        </MenuItem>
        <MenuItem onClick={run(() => shortcutStore.openDialog())}>
          <HelpIcon fontSize={18} /> Keyboard shortcuts
        </MenuItem>
      </Menu>
    </>
  )
})
