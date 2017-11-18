import React from 'react'
import { inject, observer } from 'mobx-react'
import Dialog, {
  DialogContent,
  DialogTitle
} from 'material-ui/Dialog'
import Help from './Help'
import { withStyles } from 'material-ui/styles'
import Fade from 'material-ui/transitions/Fade'

export const styles = (theme: Object) => ({
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
      shortcutStore: {
        dialogOpen,
        closeDialog
      }
    } = this.props
    return (
      <Dialog
        open={dialogOpen}
        classes={classes}
        transition={Fade}
        onEscapeKeyUp={closeDialog}
        onBackdropClick={closeDialog}
      >
        <DialogTitle>
          Keyboard shortcuts
        </DialogTitle>
        <DialogContent>
          <Help />
        </DialogContent>
      </Dialog>
    )
  }
}

export default withStyles(styles)(HotkeyDialog)
