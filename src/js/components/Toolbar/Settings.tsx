import React from 'react'
import { observer } from 'mobx-react'
import Settings from '@material-ui/icons/SettingsSharp'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/StoreContext'

export default observer(() => {
  const { userStore } = useStore()
  return (
    <Tooltip title='Settings' enterDelay={TOOLTIP_DELAY}>
      <div>
        <IconButton
          onClick={() => userStore.openDialog()}
          className='focus:outline-none'
        >
          <Settings />
        </IconButton>
      </div>
    </Tooltip>
  )
})
