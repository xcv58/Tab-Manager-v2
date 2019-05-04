import React from 'react'
import Tooltip from '@material-ui/core/Tooltip'
import Refresh from '@material-ui/icons/Refresh'
import IconButton from '@material-ui/core/IconButton'

class Relaod extends React.Component {
  render () {
    const { reload } = this.props
    return (
      <Tooltip title='Reload all tabs'>
        <IconButton onClick={reload}>
          <Refresh />
        </IconButton>
      </Tooltip>
    )
  }
}

export default Relaod
