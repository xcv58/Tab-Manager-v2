import React from 'react'
import { observer } from 'mobx-react-lite'
import Settings from '@mui/icons-material/SettingsSharp'
import IconButton from '@mui/material/IconButton'
import { Tooltip } from '@material-tailwind/react'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const TITLE = 'Settings'

export default observer(() => {
  const { userStore } = useStore()
  return (
    <Tooltip content={TITLE} enterDelay={TOOLTIP_DELAY}>
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
