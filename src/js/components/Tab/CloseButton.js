import React from 'react'
import { inject, observer } from 'mobx-react'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from '@material-ui/core/IconButton'
import { withTheme } from '@material-ui/core/styles'
import { backgroundColor } from 'libs/colors'

@withTheme()
@inject('dragStore')
@observer
export default class CloseButton extends React.Component {
  onClick = () => {
    const { removing, remove } = this.props.tab
    if (!removing) {
      remove()
    }
  }

  render () {
    const { theme } = this.props
    return (
      <IconButton
        onClick={this.onClick}
        style={{
          color: theme.palette.secondary.main,
          backgroundColor
        }}
      >
        <CloseIcon />
      </IconButton>
    )
  }
}
