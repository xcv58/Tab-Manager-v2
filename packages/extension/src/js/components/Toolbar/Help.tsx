import React from 'react'
import { observer } from 'mobx-react-lite'
import { HelpIcon } from 'icons/materialIcons'
import IconButton from 'components/ui/IconButton'
import Tooltip from 'components/ui/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const TITLE = 'Show shortcut hints'

export default observer(() => {
  const { shortcutStore } = useStore()
  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={() => shortcutStore.openDialog()}
          className="focus:outline-none"
          aria-label={TITLE}
        >
          <HelpIcon />
        </IconButton>
      </div>
    </Tooltip>
  )
})
