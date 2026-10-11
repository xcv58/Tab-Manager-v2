import React from 'react'
import { observer } from 'mobx-react-lite'
import { useDragDropManager, useDragLayer } from 'react-dnd'
import { useStore } from './hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import { getUiColorTokens } from 'libs/uiColorTokens'
import { getDragPreviewLabel } from 'libs/dragPreview'

export default observer(() => {
  const theme = useAppTheme()
  const manager = useDragDropManager()
  const { targetId } = useDragLayer(() => {
    const ids = manager.getMonitor().getTargetIds()
    return { targetId: ids[ids.length - 1] ?? null }
  })
  const { tabStore, dragStore, userStore } = useStore()
  const colors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  const count = tabStore.selection.size
  // Check the live innermost target so leaving a zone restores the count,
  // even before another drop target receives a hover event.
  const label = getDragPreviewLabel(
    count,
    targetId,
    dragStore.dropPreviewTarget,
  )
  return (
    <div
      data-testid="drag-action-preview"
      className="rounded-md border px-3 py-2 text-sm font-medium text-center shadow-lg"
      style={{
        maxWidth: 'min(24rem, calc(100vw - 16px))',
        backgroundColor: colors.toolbarShellBackground,
        borderColor: colors.toolbarShellBorderColor,
        color: colors.primaryText,
      }}
    >
      {label}
    </div>
  )
})
