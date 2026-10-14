import React from 'react'
import { observer } from 'mobx-react-lite'
import Menu, { MenuDivider, MenuItem, MenuSection } from './ui/Menu'
import { useActionMenu } from './hooks/useActionMenu'
import { useStore } from './hooks/useStore'
import CommandPaletteIcon from './CommandPaletteIcon'

export default observer(function WorkspaceMenu() {
  const { actionStore, tabStore } = useStore()
  const menu = useActionMenu('workspace')
  if (!menu.open) return null
  const ids = new Set([
    'select-matching',
    'invert-selection',
    'clear-selection',
    ...(tabStore.selection.size
      ? ['copy-format-selection', 'export-selection', 'move-selection']
      : []),
    'collapse-all',
    'expand-all',
    'sync',
    'settings',
    'help',
  ])
  const commands = actionStore.commands.filter((command) => ids.has(command.id))
  return (
    <Menu {...menu} data-testid="workspace-menu">
      <MenuSection>
        Workspace
        {tabStore.selection.size
          ? ` · ${tabStore.selection.size} selected tabs`
          : ''}
      </MenuSection>
      <MenuItem onClick={() => actionStore.openPalette()}>
        <CommandPaletteIcon name="keyboard" />
        Command palette
      </MenuItem>
      <MenuDivider />
      {commands.map((command) => (
        <MenuItem
          key={command.id}
          disabled={!!command.disabledReason}
          aria-label={command.label}
          onClick={() => {
            if (command.keepOpen) actionStore.openPalette()
            else menu.onClose()
            void actionStore.execute(command)
          }}
        >
          <CommandPaletteIcon name={command.icon} />
          {command.label}
        </MenuItem>
      ))}
    </Menu>
  )
})
