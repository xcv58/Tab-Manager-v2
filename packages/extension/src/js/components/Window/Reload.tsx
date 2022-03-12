import React from 'react'
import Tooltip from '@mui/material/Tooltip'
import Refresh from '@mui/icons-material/Refresh'
import IconButton from '@mui/material/IconButton'

export default ({ reload }) => (
  <Tooltip title="Reload all tabs">
    <IconButton onClick={reload} className="focus:outline-none">
      <Refresh />
    </IconButton>
  </Tooltip>
)
