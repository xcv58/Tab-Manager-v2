import React from 'react'
import { inject, observer } from 'mobx-react'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from 'material-ui/IconButton'
import { withTheme } from 'material-ui/styles'
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
    const {
      theme,
      faked,
      dragStore: { dragging },
      tab: { isHovered }
    } = this.props
    if (faked || dragging || !isHovered) {
      return null
    }
    return (
      <IconButton
        onClick={this.onClick}
        style={{
          position: 'absolute',
          right: 0,
          color: theme.palette.secondary.main,
          backgroundColor
        }}
      >
        <CloseIcon />
      </IconButton>
    )
  }
}
