import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import IconButton from '@material-ui/core/IconButton'
import Sync from '@material-ui/icons/Sync'
import WindowsStore from 'stores/WindowStore'

@inject('windowStore')
@observer
class SyncButton extends React.Component<{
  windowStore: WindowsStore
}> {
  render () {
    return (
      <Tooltip title='Sync All Windows' placement='left'>
        <IconButton onClick={this.props.windowStore.syncAllWindows}>
          <Sync />
        </IconButton>
      </Tooltip>
    )
  }
}

export default SyncButton
