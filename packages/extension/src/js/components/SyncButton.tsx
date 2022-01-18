import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Sync from '@mui/icons-material/Sync'
import { useStore } from './hooks/useStore'

export default observer(() => {
  const { windowStore } = useStore()
  return (
    <Tooltip title="Sync All Windows" placement="left">
      <IconButton
        onClick={() => windowStore.syncAllWindows()}
        className="focus:outline-none"
      >
        <Sync />
      </IconButton>
    </Tooltip>
  )
})
