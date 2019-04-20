import React from 'react'
import { withStyles } from '@material-ui/core/styles'

const styles = theme => ({
  root: {
    margin: `0 ${theme.spacing.unit}px`,
    backgroundColor: theme.palette.divider,
    height: '100%',
    width: 1
  }
})

export default withStyles(styles)(({ classes }) => (
  <div className={classes.root} />
))
