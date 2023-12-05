import React from 'react'
import ReactCommandPalette from 'react-command-palette'
import { observer } from 'mobx-react-lite'
import { Tooltip } from '@material-tailwind/react'
import LiveHelpOutlined from '@mui/icons-material/LiveHelpOutlined'
import IconButton from '@mui/material/IconButton'
import { useStore } from './hooks/useStore'
import CommandPaletteHeader from './CommandPaletteHeader'

const trigger = (
  <Tooltip content="Command Palette">
    <IconButton onClick={() => {}} className="focus:outline-none">
      <LiveHelpOutlined />
    </IconButton>
  </Tooltip>
)

const Shortcut = ({ shortcut }) => {
  if (!Array.isArray(shortcut)) {
    return <kbd className="shortcut">{shortcut}</kbd>
  }
  return (
    <>
      {shortcut.map((x) => (
        <Shortcut key={x} shortcut={x} />
      ))}
    </>
  )
}

const Command = (props) => {
  return (
    <div className="item">
      {props.highlight && (
        <span dangerouslySetInnerHTML={{ __html: props.highlight }} />
      )}
      {!props.highlight && <span>{props.name}</span>}
      <Shortcut {...props} />
    </div>
  )
}

export default observer(() => {
  const { shortcutStore } = useStore()
  const { shortcuts, pause, resume } = shortcutStore
  const commands = shortcuts
    .map(([shortcut, command, name]) => {
      if (typeof name !== 'string') {
        return null
      }
      return { name, shortcut, command }
    })
    .filter((x) => x)
    .sort((a, b) => a.name.localeCompare(b.name))
  return (
    <ReactCommandPalette
      shouldReturnFocusAfterClose={false}
      closeOnSelect
      header={<CommandPaletteHeader />}
      commands={commands}
      trigger={trigger}
      onAfterOpen={pause}
      onRequestClose={resume}
      renderCommand={Command}
      maxDisplayed={commands.length}
    />
  )
})
