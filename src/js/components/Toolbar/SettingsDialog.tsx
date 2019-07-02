import React from 'react'
import { observer } from 'mobx-react'
import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import DialogContent from '@material-ui/core/DialogContent'
import Divider from '@material-ui/core/Divider'
import FormControl from '@material-ui/core/FormControl'
import FormGroup from '@material-ui/core/FormGroup'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import FormHelperText from '@material-ui/core/FormHelperText'
import Fade from '@material-ui/core/Fade'
import Switch from '@material-ui/core/Switch'
import { withStyles } from '@material-ui/core/styles'
import { useStore } from 'components/StoreContext'

export const styles = () => ({
  paper: {
    width: '100%'
  }
})

const SettingsDialog = observer(({ classes }) => {
  const { userStore } = useStore()
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
    toggleAutoHide,
    showUrl,
    toggleShowUrl,
    autoFocusSearch,
    toggleAutoFocusSearch,
    darkTheme,
    toggleDarkTheme
  } = userStore
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
        <FormControl>
          <FormGroup>
            <FormHelperText>Search</FormHelperText>
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
              label='Auto Focus Search Box'
              control={
                <Switch
                  color='primary'
                  checked={autoFocusSearch}
                  onChange={toggleAutoFocusSearch}
                />
              }
            />
            <Divider />
          </FormGroup>
          <FormGroup>
            <FormHelperText>Views</FormHelperText>
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
              label='Show Unmatched Tab'
              control={
                <Switch
                  color='primary'
                  checked={showUnmatchedTab}
                  onChange={toggleShowUnmatchedTab}
                />
              }
            />
            <Divider />
          </FormGroup>
          <FormGroup>
            <FormHelperText>Individual Tab</FormHelperText>
            <FormControlLabel
              label='Show URL'
              control={
                <Switch
                  color='primary'
                  checked={showUrl}
                  onChange={toggleShowUrl}
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
            <Divider />
          </FormGroup>
          <FormGroup>
            <FormHelperText>Others</FormHelperText>
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
            <FormControlLabel
              label='Dark Theme'
              control={
                <Switch
                  color='primary'
                  checked={darkTheme}
                  onChange={toggleDarkTheme}
                />
              }
            />
          </FormGroup>
        </FormControl>
      </DialogContent>
    </Dialog>
  )
})

export default withStyles(styles)(SettingsDialog)
