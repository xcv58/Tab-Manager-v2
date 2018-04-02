import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from 'material-ui/Tooltip'
import Switch from 'material-ui/Switch'

@inject('userStore')
@observer
export default class ToolbarSwitch extends React.Component {
  render () {
    const { toolbarAutoHide, toggleAutoHide } = this.props.userStore
    return (
      <Tooltip title='Always show toolbar'>
        <div>
          <Switch
            color='primary'
            checked={!toolbarAutoHide}
            onChange={toggleAutoHide}
          />
        </div>
      </Tooltip>
    )
  }
}
