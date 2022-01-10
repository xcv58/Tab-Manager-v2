import React from 'react'
import Tooltip from '@mui/material/Tooltip'
import OpenInBrowser from '@mui/icons-material/OpenInBrowser'
import IconButton from '@mui/material/IconButton'
import { openInNewTab } from 'libs'

export default () => (
  <Tooltip title="Open in new tab" placement="left">
    <IconButton onClick={openInNewTab} className="focus:outline-none">
      <OpenInBrowser />
    </IconButton>
  </Tooltip>
)
