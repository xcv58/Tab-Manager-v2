import React from 'react'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from '@material-ui/core/IconButton'
import {
  Theme,
  createStyles,
  WithStyles,
  withStyles
} from '@material-ui/core/styles'

const styles = ({ palette }: Theme) =>
  createStyles({
    icon: {
      opacity: 0.6,
      '&:hover': {
        opacity: 1,
        color: palette.error.main
      }
    }
  })

interface Props extends WithStyles<typeof styles> {
  disabled: boolean
}

export default withStyles(styles)(
  ({ classes, disabled = false, ...rest }: Props) => (
    <IconButton {...{ ...rest, disabled }} className={classes.icon}>
      <CloseIcon />
    </IconButton>
  )
)
