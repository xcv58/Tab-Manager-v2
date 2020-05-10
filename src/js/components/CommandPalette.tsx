import React from 'react'
import ReactCommandPalette from 'react-command-palette'
import { observer } from 'mobx-react-lite'
import Tooltip from '@material-ui/core/Tooltip'
import LiveHelpOutlined from '@material-ui/icons/LiveHelpOutlined'
import IconButton from '@material-ui/core/IconButton'
import { useStore } from './StoreContext'
import CommandPaletteHeader from './CommandPaletteHeader'

const trigger = (
  <Tooltip title='Command Palette'>
    <IconButton onClick={() => {}} className='focus:outline-none'>
      <LiveHelpOutlined />
    </IconButton>
  </Tooltip>
)

const Shortcut = ({ shortcut }) => <kbd className='shortcut'>{shortcut}</kbd>

const Command = (props) => {
  const { shortcut } = props
  const shortcuts = Array.isArray(shortcut) ? (
    shortcut.map((x) => <Shortcut key={x} shortcut={x} />)
  ) : (
    <Shortcut shortcut={shortcut} />
  )
  return (
    <div className='item'>
      {props.highlight ? (
        <span dangerouslySetInnerHTML={{ __html: props.highlight }} />
      ) : (
        <span>{props.name}</span>
      )}
      {shortcuts}
    </div>
  )
}

export default observer(() => {
  const { shortcutStore } = useStore()
  const { shortcuts, pause, resume } = shortcutStore
  const commands = shortcuts
    .map(([shortcut, command, name]) => {
      if (typeof name !== 'string') {
        return
      }
      return { name, shortcut, command }
    })
    .filter((x) => x)
    .sort((a, b) => a.name.localeCompare(b.name))
  return (
    <ReactCommandPalette
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
