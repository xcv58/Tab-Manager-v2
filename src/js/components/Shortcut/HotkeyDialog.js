import React from 'react'
import { inject, observer } from 'mobx-react'
import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import DialogContent from '@material-ui/core/DialogContent'
import Help from './Help'
import { withStyles } from '@material-ui/core/styles'
import Fade from '@material-ui/core/Fade'

export const styles = theme => ({
  paper: {
    width: '100%'
  }
})

@inject('shortcutStore')
@observer
class HotkeyDialog extends React.Component {
  render () {
    const {
      classes,
      shortcutStore: { dialogOpen, closeDialog }
    } = this.props
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
  }
}

export default withStyles(styles)(HotkeyDialog)
