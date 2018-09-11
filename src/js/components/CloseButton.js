import React from 'react'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from '@material-ui/core/IconButton'
import { withStyles } from '@material-ui/core/styles'

const styles = theme => ({
  icon: {
    opacity: 0.6,
    '&:hover': {
      opacity: 1,
      color: theme.palette.error.main
    }
  }
})

@withStyles(styles)
export default class CloseButton extends React.Component {
  static defaultProps = {
    disabled: false
  }

  render () {
    const { classes, onClick, disabled } = this.props
    return (
      <IconButton {...{ onClick, disabled }} className={classes.icon}>
        <CloseIcon />
      </IconButton>
    )
  }
}
