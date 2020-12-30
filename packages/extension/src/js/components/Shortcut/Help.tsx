import React from 'react'
import { observer } from 'mobx-react-lite'
import Table from '@material-ui/core/Table'
import TableHead from '@material-ui/core/TableHead'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableRow from '@material-ui/core/TableRow'
import Hotkeys from './Hotkeys'
import { getDescription } from 'stores/ShortcutStore'
import { useStore } from 'components/hooks/useStore'
import Alert from '@material-ui/lab/Alert'

const keysSearch = (keys: string | string[], search: string) => {
  if (typeof keys === 'string') {
    return keys.includes(search)
  }
  return keys.join('').includes(search)
}

export default observer((props: { search: string }) => {
  const { search } = props
  const { shortcutStore } = useStore()
  const { shortcuts } = shortcutStore

  const content = shortcuts
    .filter(
      ([keys, _, description]) =>
        getDescription(description).toLowerCase().includes(search) ||
        keysSearch(keys, search)
    )
    .map(([keys, _, description], i) => (
      <TableRow key={i} hover>
        <TableCell>{getDescription(description)}</TableCell>
        <Hotkeys keys={keys} />
      </TableRow>
    ))
  if (!content.length) {
    return <Alert severity="error">No shortcut found</Alert>
  }
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Action</TableCell>
          <TableCell>Hotkey(s)</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>{content}</TableBody>
    </Table>
  )
})
