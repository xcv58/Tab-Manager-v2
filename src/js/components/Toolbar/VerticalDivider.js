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

@withStyles(styles)
export default class VerticalDivider extends React.Component {
  render () {
    const { classes } = this.props
    return <div className={classes.root} />
  }
}
