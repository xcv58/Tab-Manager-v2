import React from 'react'
import { observer } from 'mobx-react'
import Help from '@material-ui/icons/Help'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/StoreContext'

export default observer(() => {
  const { shortcutStore } = useStore()
  return (
    <Tooltip title='Show shortcut hints' enterDelay={TOOLTIP_DELAY}>
      <div>
        <IconButton onClick={() => shortcutStore.openDialog()}>
          <Help />
        </IconButton>
      </div>
    </Tooltip>
  )
})
