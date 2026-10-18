import { isSafari } from 'libs/browserCapabilities'
import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from 'components/ui/Tooltip'
import IconButton from 'components/ui/IconButton'
import { SyncIcon } from 'icons/materialIcons'
import { useStore } from './hooks/useStore'

export default observer(() => {
  const { windowStore } = useStore()
  const title = isSafari ? 'Refresh Safari tabs' : 'Sync All Windows'
  return (
    <Tooltip title={title} placement="left">
      <IconButton
        aria-label={title}
        data-testid="sync-all-windows"
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
