import React from 'react'
import { observer } from 'mobx-react-lite'
import Checkbox from '@mui/material/Checkbox'
import Tooltip from '@mui/material/Tooltip'
import { DEFAULT_CONTROL_SIZE } from 'libs/layoutMetrics'

const CONTROL_SX = {
  width: DEFAULT_CONTROL_SIZE,
  height: DEFAULT_CONTROL_SIZE,
  p: 0.625,
  m: 0,
  '& .MuiSvgIcon-root': {
    fontSize: 20,
  },
}

export default observer(({ win }) => {
  const { allTabSelected, someTabSelected, disableSelectAll, toggleSelectAll } =
    win
  const title = `${allTabSelected ? 'Unselect' : 'Select'} all tabs`
  return (
    <Tooltip title={title}>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center"
        style={{ width: DEFAULT_CONTROL_SIZE, height: DEFAULT_CONTROL_SIZE }}
      >
        <Checkbox
          color="primary"
          inputProps={{
            'aria-label': title,
          }}
          disabled={disableSelectAll}
          checked={allTabSelected}
          onChange={(e) => {
            e.target.blur()
            toggleSelectAll()
          }}
          indeterminate={someTabSelected || disableSelectAll}
          sx={CONTROL_SX}
        />
      </span>
    </Tooltip>
  )
})
