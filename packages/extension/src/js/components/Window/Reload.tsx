import React from 'react'
import { Tooltip } from '@material-tailwind/react'
import Refresh from '@mui/icons-material/Refresh'
import IconButton from '@mui/material/IconButton'

export default ({ reload }) => (
  <Tooltip content="Reload all tabs">
    <IconButton onClick={reload} className="focus:outline-none">
      <Refresh />
    </IconButton>
  </Tooltip>
)
