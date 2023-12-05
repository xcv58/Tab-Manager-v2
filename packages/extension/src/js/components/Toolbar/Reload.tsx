import React from 'react'
import { observer } from 'mobx-react-lite'
import Refresh from '@mui/icons-material/Refresh'
import IconButton from '@mui/material/IconButton'
import { Tooltip } from '@material-tailwind/react'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const TITLE = 'Reload select tab(s)'

export default observer(() => {
  const { hasFocusedOrSelectedTab, reload } = useStore()
  return (
    <Tooltip content={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={reload}
          disabled={!hasFocusedOrSelectedTab}
          className="focus:outline-none"
          aria-label={TITLE}
        >
          <Refresh />
        </IconButton>
      </div>
    </Tooltip>
  )
})
