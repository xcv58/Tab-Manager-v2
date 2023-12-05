import React from 'react'
import { observer } from 'mobx-react-lite'
import DeleteSweep from '@mui/icons-material/DeleteSweep'
import IconButton from '@mui/material/IconButton'
import { Tooltip } from '@material-tailwind/react'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const TITLE = 'Clean duplicated tabs'

export default observer(() => {
  const { windowStore } = useStore()
  const { cleanDuplicatedTabs, duplicatedTabs } = windowStore
  return (
    <Tooltip content={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={cleanDuplicatedTabs}
          disabled={duplicatedTabs.length === 0}
          className="focus:outline-none"
          aria-label={TITLE}
        >
          <DeleteSweep />
        </IconButton>
      </div>
    </Tooltip>
  )
})
