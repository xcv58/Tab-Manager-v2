import React from 'react'
import { inject, observer } from 'mobx-react'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from 'material-ui/IconButton'
import { withTheme } from 'material-ui/styles'
import { backgroundColor } from 'libs/colors'

@inject('dragStore')
@observer
class CloseButton extends React.Component {
  render () {
    const {
      theme,
      faked,
      dragStore: { dragging },
      tab: { isHovered, remove }
    } = this.props
    if (faked || dragging || !isHovered) {
      return null
    }
    return (
      <IconButton
        onClick={remove}
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

export default withTheme()(CloseButton)
