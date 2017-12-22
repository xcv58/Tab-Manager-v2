import React from 'react'
import { TableCell } from 'material-ui/Table'
import { blue500 } from 'libs/colors'

export default ({ keys }) => {
  let content = keys
  if (typeof keys !== 'string') {
    content = keys.map((key) => (
      <span key={key}>
        {key}
      </span>
    ))
  }
  return (
    <TableCell style={{
      padding: 0
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        color: blue500,
        textTransform: 'capitalize'
      }}>
        {content}
      </div>
    </TableCell>
  )
}
