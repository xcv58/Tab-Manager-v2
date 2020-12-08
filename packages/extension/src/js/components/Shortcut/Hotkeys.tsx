import React from 'react'
import TableCell from '@material-ui/core/TableCell'
import Shortcuts from './Shortcuts'

const Hotkeys = ({ keys }: { keys: string | string[] }) => {
  return (
    <TableCell
      style={{
        padding: 0
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          textTransform: 'capitalize'
        }}
      >
        <Shortcuts shortcut={keys} />
      </div>
    </TableCell>
  )
}

export default Hotkeys
