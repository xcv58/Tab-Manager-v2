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

const CloseButton = props => {
  const { classes, onClick, disabled } = props
  return (
    <IconButton {...{ onClick, disabled }} className={classes.icon}>
      <CloseIcon />
    </IconButton>
  )
}

export default withStyles(styles)(CloseButton)
