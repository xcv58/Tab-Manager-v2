import React from 'react'
import { observer } from 'mobx-react-lite'
import Checkbox from '@mui/material/Checkbox'
import Tooltip from '@mui/material/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

export default observer(() => {
  const { searchStore } = useStore()
  const { allTabSelected, someTabSelected, matchedTabs } = searchStore
  const title = (allTabSelected ? 'Unselect' : 'Select') + ' all tabs'
  return (
    <Tooltip title={title} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <Checkbox
          color="primary"
          checked={allTabSelected}
          disabled={matchedTabs.length === 0}
          onChange={(e) => {
            e.target.blur()
            searchStore.toggleSelectAll()
          }}
          indeterminate={someTabSelected}
          inputProps={{ 'aria-label': title }}
        />
      </div>
    </Tooltip>
  )
})
