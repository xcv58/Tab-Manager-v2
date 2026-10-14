import React from 'react'
import { useActionMenu } from './hooks/useActionMenu'
import { getCommandPaletteShortcutLabel } from 'libs/commandPaletteShortcut'
import { observer } from 'mobx-react-lite'
import Menu, { MenuItem, MenuDivider } from 'components/ui/Menu'
import { MoreHorizIcon } from 'icons/materialIcons'
import ControlIconButton from 'components/ControlIconButton'
import { useStore } from './hooks/useStore'

export default observer(() => {
  const menu = useActionMenu('popup-actions')
  const { actionStore } = useStore()

  const closeMenu = () => {
    menu.onClose()
  }

  const runAction = (action: () => void | Promise<void>) => () => {
    closeMenu()
    action()
  }

  return (
    <>
      <ControlIconButton
        onClick={menu.onOpen}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label="More actions"
      >
        <MoreHorizIcon fontSize={20} />
      </ControlIconButton>
      <Menu {...menu} onClose={closeMenu}>
        <MenuItem onClick={runAction(() => actionStore.openFullView())}>
          Open full Tab Manager
        </MenuItem>
        <MenuDivider />
        <MenuItem onClick={() => actionStore.openPalette()}>
          <span className="flex-1">Command palette</span>
          <kbd className="ml-4 text-xs opacity-70">
            {getCommandPaletteShortcutLabel()}
          </kbd>
        </MenuItem>
        <MenuItem
          onClick={runAction(() => actionStore.openFullView('shortcuts'))}
        >
          Keyboard shortcuts in full view
        </MenuItem>
        <MenuItem
          onClick={runAction(() => actionStore.openFullView('settings'))}
        >
          Settings in full view
        </MenuItem>
      </Menu>
    </>
  )
})
