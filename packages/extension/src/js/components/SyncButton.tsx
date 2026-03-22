import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@mui/material/Tooltip'
import IconButton from 'components/ui/IconButton'
import { SyncIcon } from 'icons/materialIcons'
import { useStore } from './hooks/useStore'

export default observer(() => {
  const { windowStore } = useStore()
  return (
    <Tooltip title="Sync All Windows" placement="left">
      <IconButton
        onClick={() =>
          void windowStore.syncAllWindows({
            revealActiveTab: true,
            origin: 'mouse',
          })
        }
        className="focus:outline-none"
      >
        <SyncIcon />
      </IconButton>
    </Tooltip>
  )
})
