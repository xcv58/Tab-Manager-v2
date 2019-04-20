import React from 'react'
import { inject, observer } from 'mobx-react'
import Help from '@material-ui/icons/Help'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import ShortcutStore from 'stores/ShortcutStore'

const HelpComponent = ({ shortcutStore }: { shortcutStore: ShortcutStore }) => (
  <Tooltip title='Show shortcut hints' enterDelay={TOOLTIP_DELAY}>
    <div>
      <IconButton onClick={shortcutStore.openDialog}>
        <Help />
      </IconButton>
    </div>
  </Tooltip>
)

export default inject('shortcutStore')(observer(HelpComponent))
