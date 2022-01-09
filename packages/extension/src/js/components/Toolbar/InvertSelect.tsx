import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@mui/material/Tooltip'
import Flip from '@mui/icons-material/Flip'
import IconButton from '@mui/material/IconButton'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const TITLE = 'Inverse select tabs'

export default observer(() => {
  const { searchStore } = useStore()
  const { invertSelect } = searchStore
  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={invertSelect}
          className="focus:outline-none"
          aria-label={TITLE}
        >
          <Flip />
        </IconButton>
      </div>
    </Tooltip>
  )
})
