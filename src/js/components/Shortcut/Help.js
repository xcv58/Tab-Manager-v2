import React from 'react'
import { inject, observer } from 'mobx-react'
import Table, { TableBody, TableCell, TableRow } from 'material-ui/Table'
import Hotkeys from './Hotkeys'

@inject('shortcutStore')
@observer
export default class Help extends React.Component {
  render () {
    const { shortcutStore: { shortcuts } } = this.props
    const content = shortcuts.map(([ keys, _, description ], i) => (
      <TableRow key={i} hover>
        <Hotkeys keys={keys} />
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
