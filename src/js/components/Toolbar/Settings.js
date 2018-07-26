import React from 'react'
import { inject, observer } from 'mobx-react'
import Settings from '@material-ui/icons/SettingsSharp'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'

@inject('userStore')
@observer
export default class SettingsComponent extends React.Component {
  render () {
    const { openDialog } = this.props.userStore
    return (
      <Tooltip title='Settings' enterDelay={TOOLTIP_DELAY}>
        <div>
          <IconButton onClick={openDialog}>
            <Settings />
          </IconButton>
        </div>
      </Tooltip>
    )
  }
}
