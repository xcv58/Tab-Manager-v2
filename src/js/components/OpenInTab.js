import React from 'react'
import Tooltip from 'material-ui/Tooltip'
import OpenInBrowser from '@material-ui/icons/OpenInBrowser'
import IconButton from 'material-ui/IconButton'
import { openInNewTab } from 'libs'

export default class OpenInTab extends React.Component {
  render () {
    return (
      <Tooltip title='Open in new tab' placement='left'>
        <IconButton onClick={openInNewTab}>
          <OpenInBrowser />
        </IconButton>
      </Tooltip>
    )
  }
}
