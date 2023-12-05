import React from 'react'
import { Tooltip } from '@material-tailwind/react'
import OpenInBrowser from '@mui/icons-material/OpenInBrowser'
import IconButton from '@mui/material/IconButton'
import { openInNewTab } from 'libs'

export default () => (
  <Tooltip content="Open in new tab" placement="left">
    <IconButton onClick={openInNewTab} className="focus:outline-none">
      <OpenInBrowser />
    </IconButton>
  </Tooltip>
)
