import React from 'react'
import { observer } from 'mobx-react-lite'
import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import DialogContent from '@material-ui/core/DialogContent'
import Help from './Help'
import { withStyles } from '@material-ui/core/styles'
import Fade from '@material-ui/core/Fade'
import { useStore } from 'components/StoreContext'

export const styles = () => ({
  paper: {
    width: '100%'
  }
})

const HotkeyDialog = observer(({ classes }) => {
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

export default withStyles(styles)(HotkeyDialog)
