import React from 'react'
import { inject, observer } from 'mobx-react'
import Dialog, { DialogContent, DialogTitle } from 'material-ui/Dialog'
import { withStyles } from 'material-ui/styles'
import { FormGroup, FormControlLabel } from 'material-ui/Form'
import Fade from 'material-ui/transitions/Fade'
import Switch from 'material-ui/Switch'

export const styles = theme => ({
  paper: {
    width: '100%'
  }
})

@inject('userStore')
@observer
class SettingsDialog extends React.Component {
  render () {
    const { classes } = this.props
    const {
      dialogOpen,
      closeDialog,
      showDuplicatedTab,
      toggleShowDuplicatedTab
    } = this.props.userStore
    return (
      <Dialog
        open={dialogOpen}
        classes={classes}
        transition={Fade}
        onClose={closeDialog}
        onBackdropClick={closeDialog}
      >
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  color='primary'
                  checked={showDuplicatedTab}
                  onChange={toggleShowDuplicatedTab}
                />
              }
              label='Highlight Duplicated Tabs'
            />
          </FormGroup>
        </DialogContent>
      </Dialog>
    )
  }
}

export default withStyles(styles)(SettingsDialog)
