import React from 'react'
import { observer } from 'mobx-react-lite'
import Table from '@material-ui/core/Table'
import TableHead from '@material-ui/core/TableHead'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableRow from '@material-ui/core/TableRow'
import Hotkeys from './Hotkeys'
import { getDescription } from 'stores/ShortcutStore'
import { useStore } from 'components/StoreContext'

export default observer(() => {
  const { shortcutStore } = useStore()
  const { shortcuts } = shortcutStore

  const content = shortcuts.map(([keys, _, description], i) => (
    <TableRow key={i} hover>
      <Hotkeys keys={keys} />
      <TableCell>{getDescription(description)}</TableCell>
    </TableRow>
  ))
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Hotkeys</TableCell>
          <TableCell>Action</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>{content}</TableBody>
    </Table>
  )
})
