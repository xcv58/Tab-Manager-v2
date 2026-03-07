import React from 'react'
import Tooltip from '@mui/material/Tooltip'
import Refresh from '@mui/icons-material/Refresh'
import IconButton from '@mui/material/IconButton'

const CONTROL_SX = {
  width: 40,
  height: 40,
  p: 1,
  m: 0,
}

export default ({ reload }) => (
  <Tooltip title="Reload all tabs">
    <IconButton onClick={reload} className="focus:outline-none" sx={CONTROL_SX}>
      <Refresh />
    </IconButton>
  </Tooltip>
)
