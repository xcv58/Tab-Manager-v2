import React from 'react'
import { inject, observer } from 'mobx-react'
import Settings from '@material-ui/icons/Settings'
import IconButton from 'material-ui/IconButton'
import Tooltip from 'material-ui/Tooltip'

@inject('userStore')
@observer
export default class SettingsComponent extends React.Component {
  render () {
    const { openDialog } = this.props.userStore
    return (
      <Tooltip title='Settings'>
        <div>
          <IconButton onClick={openDialog}>
            <Settings />
          </IconButton>
        </div>
      </Tooltip>
    )
  }
}
