import React from 'react'
import { observer } from 'mobx-react-lite'
import Checkbox from '@mui/material/Checkbox'
import Tooltip from '@mui/material/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const CHECKBOX_SX = {
  '& .MuiSvgIcon-root': {
    fontSize: 20,
  },
}

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
          sx={CHECKBOX_SX}
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
