import React from 'react'
import Tooltip from 'components/ui/Tooltip'
import { OpenInBrowserIcon } from 'icons/materialIcons'
import IconButton from 'components/ui/IconButton'
import { openInNewTab } from 'libs'

export default () => (
  <Tooltip title="Open in new tab" placement="left">
    <IconButton onClick={openInNewTab} className="focus:outline-none">
      <OpenInBrowserIcon />
    </IconButton>
  </Tooltip>
)
