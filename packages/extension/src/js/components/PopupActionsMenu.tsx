import React from 'react'
import { useActionMenu } from './hooks/useActionMenu'
import { getCommandPaletteShortcutLabel } from 'libs/commandPaletteShortcut'
import { observer } from 'mobx-react-lite'
import Menu, { MenuItem, MenuDivider } from 'components/ui/Menu'
import { MoreHorizIcon } from 'icons/materialIcons'
import ControlIconButton from 'components/ControlIconButton'
import { getNoun, openInNewTab, openOrTogglePopup } from 'libs'
import { useStore } from './hooks/useStore'

export default observer(() => {
  const menu = useActionMenu('popup-actions')
  const { arrangeStore, shortcutStore, userStore, windowStore, actionStore } =
    useStore()

  const closeMenu = () => {
    menu.onClose()
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
        onClick={menu.onOpen}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label="More actions"
      >
        <MoreHorizIcon fontSize={20} />
      </ControlIconButton>
      <Menu {...menu} onClose={closeMenu}>
        <MenuItem onClick={runAction(openOrTogglePopup)}>
          Open full feature mode
        </MenuItem>
        <MenuItem onClick={runAction(openInNewTab)}>Open in new tab</MenuItem>
        <MenuDivider />
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
        <MenuDivider />
        <MenuItem onClick={runAction(() => actionStore.openPalette())}>
          <span className="flex-1">Command palette</span>
          <kbd className="ml-4 text-xs opacity-70">
            {getCommandPaletteShortcutLabel()}
          </kbd>
        </MenuItem>
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
