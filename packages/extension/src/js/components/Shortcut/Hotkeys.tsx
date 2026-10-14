import React from 'react'
import Shortcuts from './Shortcuts'

const Hotkeys = ({ keys }: { keys: string | string[] }) => {
  return (
    <td
      style={{
        padding: '8px 16px',
        verticalAlign: 'top',
        borderBottom: '1px solid var(--table-border, rgba(0,0,0,0.12))',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {(Array.isArray(keys) ? [...keys].reverse() : [keys]).map(
          (key, index) => (
            <React.Fragment key={key}>
              {index > 0 && <span className="text-xs opacity-70">or</span>}
              <Shortcuts shortcut={key} />
            </React.Fragment>
          ),
        )}
      </div>
    </td>
  )
}

export default Hotkeys
