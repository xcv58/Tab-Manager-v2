import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@material-ui/core/Tooltip'
import IconButton from '@material-ui/core/IconButton'
import Sync from '@material-ui/icons/Sync'
import { useStore } from './StoreContext'

export default observer(() => {
  const { windowStore } = useStore()
  return (
    <Tooltip title='Sync All Windows' placement='left'>
      <IconButton onClick={windowStore.syncAllWindows}>
        <Sync />
      </IconButton>
    </Tooltip>
  )
})
