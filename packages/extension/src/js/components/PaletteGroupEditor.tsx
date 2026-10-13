import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from './hooks/useStore'
import GroupEditorPopover from './TabGroup/GroupEditorPopover'

// Palette editing also works when a group's virtualized header is unmounted.
export default observer(function PaletteGroupEditor() {
  const { actionStore, tabGroupStore, focusStore } = useStore()
  if (actionStore.groupEditorId == null) return null
  const group = tabGroupStore?.getTabGroup(actionStore.groupEditorId)
  if (!group) return null
  return (
    <GroupEditorPopover
      key={group.id}
      groupId={group.id}
      anchorEl={
        focusStore.focusedItem?.nodeRef?.current ||
        actionStore.paletteFocusTarget
      }
      initialTitle={group.title || ''}
      initialColor={group.color}
      open
      onClose={actionStore.closeGroupEditor}
      onRename={(title) => tabGroupStore.renameGroup(group.id, title)}
      onRecolor={(color) => tabGroupStore.recolorGroup(group.id, color)}
    />
  )
})
