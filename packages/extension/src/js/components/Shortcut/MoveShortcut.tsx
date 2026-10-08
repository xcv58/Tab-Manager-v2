import React from 'react'
import { useAppTheme } from 'libs/appTheme'
import {
  TAB_MOVE_SHORTCUTS,
  formatTabMoveShortcut,
  type TabMovePosition,
} from 'libs/tabMoveShortcuts'

export default function MoveShortcut({
  position,
}: {
  position: TabMovePosition
}) {
  const theme = useAppTheme()
  return (
    <kbd
      aria-hidden="true"
      className="ml-auto whitespace-nowrap pl-4 text-xs"
      style={{ color: theme.palette.text.secondary }}
    >
      {formatTabMoveShortcut(TAB_MOVE_SHORTCUTS[position][1])}
    </kbd>
  )
}
