import React from 'react'
import { observer } from 'mobx-react-lite'
import { RefreshIcon } from 'icons/materialIcons'
import IconButton from 'components/ui/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const TITLE = 'Reload select tab(s)'

export default observer(() => {
  const { hasFocusedOrSelectedTab, reload } = useStore()
  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={reload}
          disabled={!hasFocusedOrSelectedTab}
          className="focus:outline-none"
          aria-label={TITLE}
        >
          <RefreshIcon />
        </IconButton>
      </div>
    </Tooltip>
  )
})
