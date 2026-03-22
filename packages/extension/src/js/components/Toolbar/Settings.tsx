import React from 'react'
import { observer } from 'mobx-react-lite'
import { SettingsSharpIcon } from 'icons/materialIcons'
import IconButton from 'components/ui/IconButton'
import Tooltip from 'components/ui/Tooltip'
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
          <SettingsSharpIcon />
        </IconButton>
      </div>
    </Tooltip>
  )
})
