import React from 'react'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import { observer } from 'mobx-react'
import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import DialogContent from '@material-ui/core/DialogContent'
import Help from './Help'
import Fade from '@material-ui/core/Fade'
import IconButton from '@material-ui/core/IconButton'
import CloseIcon from '@material-ui/icons/Close'
import { useStore } from 'components/StoreContext'
import { makeStyles, useTheme, Typography } from '@material-ui/core'

const useStyles = makeStyles(theme => ({
  paper: {
    width: '100%'
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500]
  }
}))

export default observer(props => {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const classes = useStyles(props)
  const { shortcutStore } = useStore()
  const { dialogOpen, closeDialog } = shortcutStore
  return (
    <Dialog
      open={dialogOpen}
      TransitionComponent={Fade}
      onClose={closeDialog}
      onBackdropClick={closeDialog}
      {...{ maxWidth: 'lg', classes, fullScreen }}
    >
      <DialogTitle>
        <Typography variant='h6'>Keyboard shortcuts</Typography>
        <IconButton
          aria-label='close'
          className={classes.closeButton}
          onClick={closeDialog}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Help />
      </DialogContent>
    </Dialog>
  )
})
