import React from 'react'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from '@material-ui/core/IconButton'
import { makeStyles } from '@material-ui/core'

const useStyles = makeStyles(theme => {
  return {
    icon: {
      opacity: 0.6,
      '&:hover': {
        opacity: 1,
        color: theme.palette ? theme.palette.error.main : 'red'
      }
    }
  }
})

export default props => {
  const classes = useStyles(props)
  const { onClick, disabled } = props
  return (
    <IconButton {...{ onClick, disabled }} className={classes.icon}>
      <CloseIcon />
    </IconButton>
  )
}
