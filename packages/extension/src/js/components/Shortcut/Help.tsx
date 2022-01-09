import React from 'react'
import { observer } from 'mobx-react-lite'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Hotkeys from './Hotkeys'
import { getDescription } from 'stores/ShortcutStore'
import { useStore } from 'components/hooks/useStore'
import Alert from '@mui/material/Alert'

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
