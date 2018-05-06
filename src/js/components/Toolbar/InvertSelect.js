import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from 'material-ui/Tooltip'
import Flip from '@material-ui/icons/Flip'
import IconButton from 'material-ui/IconButton'
import { TOOLTIP_DELAY } from 'libs'

@inject('searchStore')
@observer
export default class InvertSelect extends React.Component {
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
