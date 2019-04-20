import React from 'react'
import { inject, observer } from 'mobx-react'
import Help from '@material-ui/icons/Help'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'

@inject('shortcutStore')
@observer
class HelpComponent extends React.Component {
  render () {
    return (
      <Tooltip title='Show shortcut hints' enterDelay={TOOLTIP_DELAY}>
        <div>
          <IconButton onClick={this.props.shortcutStore.openDialog}>
            <Help />
          </IconButton>
        </div>
      </Tooltip>
    )
  }
}

export default HelpComponent
