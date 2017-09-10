import React from 'react'
import { inject, observer } from 'mobx-react'
import Table, { TableBody, TableCell, TableRow } from 'material-ui/Table'
import { blue } from 'material-ui/colors'

const Key = ({ keys }) => {
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
        color: blue[500],
        textTransform: 'capitalize'
      }}>
        {content}
      </div>
    </TableCell>
  )
}

@inject('shortcutStore')
@observer
export default class Help extends React.Component {
  render () {
    const { shortcutStore: { shortcuts } } = this.props
    const content = shortcuts.map(([ keys, _, description ], i) => (
      <TableRow key={i} hover>
        <Key keys={keys} />
        <TableCell>
          {description || 'default description'}
        </TableCell>
      </TableRow>
    ))
    return (
      <Table>
        <TableBody>
          {content}
        </TableBody>
      </Table>
    )
  }
}
