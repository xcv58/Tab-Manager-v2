import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@mui/material/Tooltip'
import FilterList from '@mui/icons-material/FilterList'
import IconButton from '@mui/material/IconButton'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const IS_SAFARI = process.env.IS_SAFARI === 'true'
const TITLE = 'Group & Sort Tabs'

export default observer(() => {
  if (IS_SAFARI) {
    return null
  }
  const { arrangeStore } = useStore()

  const { groupTabs } = arrangeStore
  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={() => groupTabs()}
          className="focus:outline-none"
          aria-label={TITLE}
        >
          <FilterList />
        </IconButton>
      </div>
    </Tooltip>
  )
})
