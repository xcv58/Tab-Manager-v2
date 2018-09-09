import React from 'react'
import { inject, observer } from 'mobx-react'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from '@material-ui/core/IconButton'
import { withStyles } from '@material-ui/core/styles'

const style = {
  width: '1.3rem',
  height: '1.3rem'
}
const styles = () => ({
  icon: {
    ...style,
    opacity: 0.4,
    '&:hover': {
      opacity: 1
    }
  }
})

@withStyles(styles)
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
    const { classes } = this.props
    return (
      <IconButton onClick={this.onClick} className={classes.icon}>
        <CloseIcon style={style} />
      </IconButton>
    )
  }
}
