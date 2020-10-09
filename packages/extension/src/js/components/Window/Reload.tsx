import React from 'react'
import Tooltip from '@material-ui/core/Tooltip'
import Refresh from '@material-ui/icons/Refresh'
import IconButton from '@material-ui/core/IconButton'

export default ({ reload }) => (
  <Tooltip title='Reload all tabs'>
    <IconButton onClick={reload} className='focus:outline-none'>
      <Refresh />
    </IconButton>
  </Tooltip>
)
