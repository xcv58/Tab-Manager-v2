import React from 'react'
import { inject, observer } from 'mobx-react'
import Dialog, {
  DialogContent,
  DialogTitle
} from 'material-ui/Dialog'
import Help from './Help'
import Snackbar from 'material-ui/Snackbar'
import { withStyles } from 'material-ui/styles'
import Fade from 'material-ui/transitions/Fade'

export const styles = (theme: Object) => ({
  paper: {
    width: '100%'
  }
})

@inject('shortcutStore')
@observer
class Shortcut extends React.Component {
  render () {
    const {
      classes,
      shortcutStore: {
        combo,
        toastOpen,
        dialogOpen,
        closeDialog
      }
    } = this.props
    return (
      <div>
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
        <Snackbar
          style={{
            left: 'unset',
            right: 0,
            margin: 'auto'
          }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right'
          }}
          SnackbarContentProps={{
            style: {
              fontSize: '1.5rem',
              padding: '0 2rem',
              justifyContent: 'center',
              textTransform: 'capitalize',
              background: 'rgba(0, 0, 0, 0.618)'
            }
          }}
          transition={Fade}
          open={toastOpen}
          message={combo}
        />
      </div>
    )
  }
}

export default withStyles(styles)(Shortcut)
