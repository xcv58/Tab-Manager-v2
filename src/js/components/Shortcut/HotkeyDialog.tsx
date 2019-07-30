import React from 'react'
import { observer } from 'mobx-react'
import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import DialogContent from '@material-ui/core/DialogContent'
import Help from './Help'
import Fade from '@material-ui/core/Fade'
import { useStore } from 'components/StoreContext'
import { makeStyles } from '@material-ui/styles'

const useStyles = makeStyles({
  paper: {
    width: '100%'
  }
})

export default observer(props => {
  const classes = useStyles()
  const { shortcutStore } = useStore()
  const { dialogOpen, closeDialog } = shortcutStore
  return (
    <Dialog
      open={dialogOpen}
      classes={classes}
      transition={Fade}
      onClose={closeDialog}
      onBackdropClick={closeDialog}
    >
      <DialogTitle>Keyboard shortcuts</DialogTitle>
      <DialogContent>
        <Help />
      </DialogContent>
    </Dialog>
  )
})
