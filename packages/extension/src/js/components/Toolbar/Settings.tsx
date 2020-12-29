import React from 'react'
import { observer } from 'mobx-react-lite'
import Settings from '@material-ui/icons/SettingsSharp'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const TITLE = 'Settings'

export default observer(() => {
  const { userStore } = useStore()
  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={() => userStore.openDialog()}
          className="focus:outline-none"
          aria-label={TITLE}
        >
          <Settings />
        </IconButton>
      </div>
    </Tooltip>
  )
})
