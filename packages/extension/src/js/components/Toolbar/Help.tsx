import React from 'react'
import { observer } from 'mobx-react-lite'
import Help from '@mui/icons-material/Help'
import IconButton from '@mui/material/IconButton'
import { Tooltip } from '@material-tailwind/react'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const TITLE = 'Show shortcut hints'

export default observer(() => {
  const { shortcutStore } = useStore()
  return (
    <Tooltip content={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={() => shortcutStore.openDialog()}
          className="focus:outline-none"
          aria-label={TITLE}
        >
          <Help />
        </IconButton>
      </div>
    </Tooltip>
  )
})
