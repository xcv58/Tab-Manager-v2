import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import Flip from '@material-ui/icons/Flip'
import IconButton from '@material-ui/core/IconButton'
import { TOOLTIP_DELAY } from 'libs'

@inject('searchStore')
@observer
class InvertSelect extends React.Component {
  render () {
    const { invertSelect } = this.props.searchStore
    return (
      <Tooltip title={`Inverse select tabs`} enterDelay={TOOLTIP_DELAY}>
        <div>
          <IconButton onClick={invertSelect}>
            <Flip />
          </IconButton>
        </div>
      </Tooltip>
    )
  }
}

export default InvertSelect
