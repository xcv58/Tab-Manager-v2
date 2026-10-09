import React from 'react'
import { formatTabMoveShortcut, isTabMoveShortcut } from 'libs/tabMoveShortcuts'

const Shortcuts = ({ shortcut }: { shortcut: string | string[] }) => {
  if (!Array.isArray(shortcut)) {
    return (
      <kbd
        className="px-2 py-1 mx-1 text-sm leading-loose tracking-widest text-white bg-blue-500 rounded"
        style={{
          whiteSpace: 'nowrap',
          textTransform: isTabMoveShortcut(shortcut) ? 'none' : undefined,
        }}
      >
        {formatTabMoveShortcut(shortcut)}
      </kbd>
    )
  }
  return (
    <>
      {shortcut.map((x) => (
        <Shortcuts key={x} shortcut={x} />
      ))}
    </>
  )
}

export default Shortcuts
