import { getNoun } from 'libs'
import type { DropPreviewTarget } from 'stores/DragStore'

export const getDragPreviewLabel = (
  count: number,
  activeTargetId: string | symbol | null,
  target: DropPreviewTarget | null,
) => {
  const countText = `${count} ${getNoun('tab', count)}`
  if (!target || target.targetId !== activeTargetId) {
    return countText
  }
  const destination =
    target.destination === 'new-window' ? 'new window' : target.destination
  return target.blockedHint || `Move ${countText} to ${destination}`
}
