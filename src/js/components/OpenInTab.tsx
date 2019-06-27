import React from 'react'
import Tooltip from '@material-ui/core/Tooltip'
import OpenInBrowser from '@material-ui/icons/OpenInBrowser'
import IconButton from '@material-ui/core/IconButton'
import { openInNewTab } from 'libs'

export default () => (
  <Tooltip title='Open in new tab' placement='left'>
    <IconButton onClick={openInNewTab}>
      <OpenInBrowser />
    </IconButton>
  </Tooltip>
)
