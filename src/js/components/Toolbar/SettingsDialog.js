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
      highlightDuplicatedTab,
      toggleHighlightDuplicatedTab,
      showTabTooltip,
      toggleShowTabTooltip,
      preserveSearch,
      togglePreserveSearch,
      showUnmatchedTab,
      toggleShowUnmatchedTab,
      showShortcutHint,
      toggleShowShortcutHint,
      toolbarAutoHide,
      toggleAutoHide
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
              label='Preserve Search'
              control={
                <Switch
                  color='primary'
                  checked={preserveSearch}
                  onChange={togglePreserveSearch}
                />
              }
            />
            <FormControlLabel
              label='Highlight Duplicated Tabs'
              control={
                <Switch
                  color='primary'
                  checked={highlightDuplicatedTab}
                  onChange={toggleHighlightDuplicatedTab}
                />
              }
            />
            <FormControlLabel
              label='Show Tab Tooltip'
              control={
                <Switch
                  color='primary'
                  checked={showTabTooltip}
                  onChange={toggleShowTabTooltip}
                />
              }
            />
            <FormControlLabel
              label='Show Unmatched Tab'
              control={
                <Switch
                  color='primary'
                  checked={showUnmatchedTab}
                  onChange={toggleShowUnmatchedTab}
                />
              }
            />
            <FormControlLabel
              label='Show Shortcut Hint'
              control={
                <Switch
                  color='primary'
                  checked={showShortcutHint}
                  onChange={toggleShowShortcutHint}
                />
              }
            />
            <FormControlLabel
              label='Always Show Toolbar'
              control={
                <Switch
                  color='primary'
                  checked={!toolbarAutoHide}
                  onChange={toggleAutoHide}
                />
              }
            />
          </FormGroup>
        </DialogContent>
      </Dialog>
    )
  }
}

export default withStyles(styles)(SettingsDialog)
