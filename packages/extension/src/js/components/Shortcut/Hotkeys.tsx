import React from 'react'
import Shortcuts from './Shortcuts'

const Hotkeys = ({ keys }: { keys: string | string[] }) => {
  return (
    <td
      style={{
        padding: 0,
        borderBottom: '1px solid var(--table-border, rgba(0,0,0,0.12))',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          textTransform: 'capitalize',
        }}
      >
        <Shortcuts shortcut={keys} />
      </div>
    </td>
  )
}

export default Hotkeys
