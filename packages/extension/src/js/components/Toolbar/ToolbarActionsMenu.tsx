import { canMoveTabs } from 'libs/browserCapabilities'
import React, { useEffect } from 'react'
import { useActionMenu } from 'components/hooks/useActionMenu'
import { getCommandPaletteShortcutLabel } from 'libs/commandPaletteShortcut'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import Menu, { MenuDivider, MenuItem, MenuSection } from 'components/ui/Menu'
import IconButton from 'components/ui/IconButton'
import {
  DeleteSweepIcon,
  FilterListIcon,
  ExpandMoreIcon,
  HelpIcon,
  MoreHorizIcon,
  SettingsSharpIcon,
} from 'icons/materialIcons'
import { useAppTheme } from 'libs/appTheme'
import CommandPaletteIcon from 'components/CommandPaletteIcon'

const selectionCommandIds = new Set([
  'reload-selection',
  'move-selection',
  'pin-selection',
  'copy-selection',
  'copy-titles-selection',
  'copy-titles-urls-selection',
  'copy-format-selection',
  'export-selection',
])

export default observer(function ToolbarActionsMenu({
  showLabel,
  selection = false,
  onOpenChange,
}: {
  showLabel: boolean
  selection?: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useActionMenu(selection ? 'toolbar-selection' : 'toolbar')
  useEffect(() => onOpenChange(menu.open), [menu.open, onOpenChange])
  useEffect(() => () => onOpenChange(false), [onOpenChange])
  const { tabStore, searchStore, arrangeStore, windowStore, actionStore } =
    useStore()
  const theme = useAppTheme()
  const matchCount = searchStore.matchedTabs.length
  const duplicateCount = selection
    ? 0
    : windowStore.getDuplicateTabsToRemoveCount()
  const closeMenu = () => {
    menu.onClose()
    onOpenChange(false)
  }
  const run = (action: () => void | Promise<void>) => () => {
    closeMenu()
    void action()
  }
  const openDialog = (id: 'settings' | 'help') => () => {
    const command = actionStore
      .getCommands({ includeSteps: false })
      .find((command) => command.id === id)
    if (!command) return
    closeMenu()
    // Use afterClose so the menu restores its stable opener before the dialog
    // captures a return target, instead of capturing a disappearing menu item.
    void actionStore.execute(command)
  }
  const matching = searchStore.queryActive
  const selectionCommands =
    selection && menu.open
      ? actionStore.commands.filter((command) =>
          selectionCommandIds.has(command.id),
        )
      : []
  const iconSpace = (
    <span aria-hidden="true" className="shrink-0" style={{ width: 18 }} />
  )

  return (
    <>
      <IconButton
        aria-label={
          selection ? 'Selected tab actions menu' : 'More toolbar actions'
        }
        aria-haspopup="menu"
        aria-expanded={menu.open}
        onClick={(event) => {
          menu.onOpen(event)
          onOpenChange(true)
        }}
        style={
          showLabel
            ? {
                width: 'auto',
                height: 'auto',
                minHeight: 36,
                lineHeight: 1.3,
                padding: '0 8px',
                gap: 6,
                borderRadius: 6,
              }
            : undefined
        }
      >
        {selection ? (
          <>
            <span>Actions</span>
            <ExpandMoreIcon fontSize={20} />
          </>
        ) : (
          <MoreHorizIcon fontSize={20} />
        )}
      </IconButton>
      <Menu {...menu} onClose={closeMenu}>
        {selection ? (
          <>
            <MenuSection>
              {tabStore.selection.size} selected{' '}
              {tabStore.selection.size === 1 ? 'tab' : 'tabs'}
            </MenuSection>
            {selectionCommands.map((command) => (
              <MenuItem
                key={command.id}
                disabled={!!command.disabledReason}
                onClick={() => {
                  if (command.keepOpen) actionStore.openPalette()
                  else closeMenu()
                  void actionStore.execute(command)
                }}
              >
                <CommandPaletteIcon name={command.icon} />
                {command.label}
              </MenuItem>
            ))}
          </>
        ) : (
          <>
            <MenuSection>Selection</MenuSection>
            <MenuItem
              disabled={!matchCount}
              onClick={run(() => searchStore.toggleSelectAll())}
            >
              {iconSpace}
              {searchStore.allTabSelected ? 'Deselect' : 'Select'} all{' '}
              {matchCount} {matching ? 'matching ' : ''}
              {matchCount === 1 ? 'tab' : 'tabs'}
            </MenuItem>
            <MenuDivider />
            <MenuSection>Across windows</MenuSection>
            {canMoveTabs && (
              <MenuItem onClick={run(() => arrangeStore.groupTabs())}>
                <FilterListIcon fontSize={18} /> Cluster ungrouped &amp; sort
                tabs
              </MenuItem>
            )}
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
            <MenuItem onClick={() => actionStore.openPalette()}>
              {iconSpace}
              <span className="flex-1">Command palette</span>
              <kbd className="ml-4 text-xs opacity-70">
                {getCommandPaletteShortcutLabel()}
              </kbd>
            </MenuItem>
            <MenuItem onClick={openDialog('settings')}>
              <SettingsSharpIcon fontSize={18} /> Settings
            </MenuItem>
            <MenuItem onClick={openDialog('help')}>
              <HelpIcon fontSize={18} /> Keyboard shortcuts
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  )
})
