import React from 'react'
import { observer } from 'mobx-react-lite'
import { Tooltip } from '@material-tailwind/react'
import Flip from '@mui/icons-material/Flip'
import IconButton from '@mui/material/IconButton'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const TITLE = 'Inverse select tabs'

export default observer(() => {
  const { searchStore } = useStore()
  const { invertSelect, matchedTabs } = searchStore
  return (
    <Tooltip content={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={invertSelect}
          disabled={matchedTabs.length === 0}
          className="focus:outline-none"
          aria-label={TITLE}
        >
          <Flip />
        </IconButton>
      </div>
    </Tooltip>
  )
})
