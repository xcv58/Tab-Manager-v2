import React from 'react'
import { observer } from 'mobx-react-lite'
import { Tooltip } from '@material-tailwind/react'
import IconButton from '@mui/material/IconButton'
import Sync from '@mui/icons-material/Sync'
import { useStore } from './hooks/useStore'

export default observer(() => {
  const { windowStore } = useStore()
  return (
    <Tooltip content="Sync All Windows" placement="left">
      <IconButton
        onClick={() => windowStore.syncAllWindows()}
        className="focus:outline-none"
      >
        <Sync />
      </IconButton>
    </Tooltip>
  )
})
