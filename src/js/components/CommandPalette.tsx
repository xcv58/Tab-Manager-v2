import React from 'react'
import ReactCommandPalette from 'react-command-palette'
import { observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import LiveHelpOutlined from '@material-ui/icons/LiveHelpOutlined'
import IconButton from '@material-ui/core/IconButton'
import { useStore } from './StoreContext'

const trigger = (
  <Tooltip title='Command Palette'>
    <IconButton onClick={() => {}}>
      <LiveHelpOutlined />
    </IconButton>
  </Tooltip>
)

export default observer(() => {
  const { shortcutStore } = useStore()
  const { shortcuts, pause, resume } = shortcutStore
  const commands = shortcuts.map(([key, command, description]) => {
    const name = typeof description === 'function' ? description() : description
    return {
      name,
      shortcut: key,
      command
    }
  })
  return (
    <ReactCommandPalette
      closeOnSelect
      commands={commands}
      trigger={trigger}
      onAfterOpen={pause}
      onRequestClose={resume}
    />
  )
})
