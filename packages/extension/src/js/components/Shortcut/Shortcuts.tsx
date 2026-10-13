import React from 'react'
import { formatShortcutLabel } from 'libs/shortcutLabel'

const Shortcuts = ({ shortcut }: { shortcut: string | string[] }) => {
  if (!Array.isArray(shortcut)) {
    return (
      <kbd
        className="px-2 py-1 text-sm leading-loose text-white bg-blue-500 rounded"
        style={{
          whiteSpace: 'nowrap',
          textTransform: 'none',
        }}
      >
        {formatShortcutLabel(shortcut)}
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
