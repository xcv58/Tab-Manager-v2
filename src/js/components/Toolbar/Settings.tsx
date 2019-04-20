import React from 'react'
import { inject, observer } from 'mobx-react'
import Settings from '@material-ui/icons/SettingsSharp'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import UserStore from 'stores/UserStore'

const SettingsComponent = ({ userStore }: { userStore: UserStore }) => (
  <Tooltip title='Settings' enterDelay={TOOLTIP_DELAY}>
    <div>
      <IconButton onClick={userStore.openDialog}>
        <Settings />
      </IconButton>
    </div>
  </Tooltip>
)

export default inject('userStore')(observer(SettingsComponent))
