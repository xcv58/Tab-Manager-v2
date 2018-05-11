import React from 'react'
import { inject, observer } from 'mobx-react'
import Help from '@material-ui/icons/Help'
import IconButton from 'material-ui/IconButton'
import Tooltip from 'material-ui/Tooltip'
import { TOOLTIP_DELAY } from 'libs'

@inject('shortcutStore')
@observer
export default class HelpComponent extends React.Component {
  render () {
    const { openDialog } = this.props.shortcutStore
    return (
      <Tooltip title='Show shortcut hints' enterDelay={TOOLTIP_DELAY}>
        <div>
          <IconButton onClick={openDialog}>
            <Help />
          </IconButton>
        </div>
      </Tooltip>
    )
  }
}
