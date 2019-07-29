import React from 'react'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from '@material-ui/core/IconButton'
import { makeStyles } from '@material-ui/styles'

const useStyles = makeStyles(theme => ({
  icon: {
    opacity: 0.6,
    '&:hover': {
      opacity: 1,
      color: theme.palette.error.main
    }
  }
}))

export default props => {
  const classes = useStyles()
  const { onClick, disabled } = props
  return (
    <IconButton {...{ onClick, disabled }} className={classes.icon}>
      <CloseIcon />
    </IconButton>
  )
}
